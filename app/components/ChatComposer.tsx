"use client";
/* eslint-disable jsx-a11y/media-has-caption -- User-recorded voice messages have no supplied transcript. Text messages remain available. */
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Mic, Paperclip, Send, Square, X } from "lucide-react";
export type ChatAttachment = {
  url: string;
  name: string;
  type: string;
  size: number;
};
export function ChatComposer({
  target,
  busy,
  send,
}: {
  target: string;
  busy: boolean;
  send: (
    text: string,
    attachments: ChatAttachment[],
    clientId: string,
  ) => Promise<boolean>;
}) {
  const [text, setText] = useState(""),
    [files, setFiles] = useState<ChatAttachment[]>([]),
    [uploading, setUploading] = useState(false),
    [recording, setRecording] = useState(false),
    [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    requestId = useRef(crypto.randomUUID());
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state !== "inactive") recorder.current.stop();
      }
      stream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );
  async function upload(items: File[]) {
    setError("");
    setUploading(true);
    try {
      for (const file of items) {
        if (file.size > 4_000_000)
          throw new Error("Размер одного файла · до 4 МБ");
        const payload = new FormData();
        payload.set("file", file);
        payload.set("visibility", "private");
        payload.set("scope", "chat");
        const response = await fetch("/api/admin/media", {
          method: "POST",
          body: payload,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Не удалось загрузить файл");
        setFiles((current) => [
          ...current,
          { url: data.url, name: file.name, type: file.type, size: file.size },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }
  async function record() {
    setError("");
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Запись голоса недоступна в этом браузере. Можно прикрепить аудиофайл.",
        );
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = input;
      const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const active = new MediaRecorder(
        input,
        mime ? { mimeType: mime } : undefined,
      );
      recorder.current = active;
      const chunks: Blob[] = [];
      active.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      active.onstop = () => {
        if (timer.current) clearTimeout(timer.current);
        input.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const type = active.mimeType.split(";")[0],
          blob = new Blob(chunks, { type });
        if (blob.size)
          void upload([
            new File(
              [blob],
              `Голосовое-${new Date().toISOString().slice(11, 19).replaceAll(":", "-")}.${type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm"}`,
              { type },
            ),
          ]);
      };
      active.start();
      setRecording(true);
      timer.current = setTimeout(() => {
        if (active.state === "recording") active.stop();
      }, 180_000);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError(e instanceof Error ? e.message : "Разрешите доступ к микрофону");
    }
  }
  async function submit() {
    if (
      busy ||
      uploading ||
      recording ||
      (!text.trim() && !files.length) ||
      !target
    )
      return;
    if (await send(text, files, requestId.current)) {
      setText("");
      setFiles([]);
      requestId.current = crypto.randomUUID();
    }
  }
  return (
    <div className="chat-composer">
      <textarea
        aria-label="Сообщение"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={4000}
        placeholder="Напишите сообщение…"
        disabled={!target || busy}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            void submit();
          }
        }}
      />
      {files.length ? (
        <ul className="chat-pending-files">
          {files.map((file, i) => (
            <li key={file.url}>
              <span>{file.name}</span>
              <button
                type="button"
                disabled={busy}
                aria-label={`Убрать ${file.name}`}
                onClick={() =>
                  setFiles((current) =>
                    current.filter((_, index) => index !== i),
                  )
                }
              >
                <X />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="chat-composer-actions">
        <label className="chat-attach">
          <Paperclip />
          <span>{uploading ? "Загружаем…" : "Прикрепить"}</span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav"
            disabled={
              !target || busy || uploading || recording || files.length >= 8
            }
            onChange={(e) => {
              void upload(
                Array.from(e.target.files || []).slice(0, 8 - files.length),
              );
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          aria-label={recording ? "Остановить запись" : "Записать голосовое"}
          disabled={!target || busy || uploading || files.length >= 8}
          onClick={() => (recording ? recorder.current?.stop() : void record())}
        >
          {recording ? <Square /> : <Mic />}
          {recording ? "Остановить" : "Голосовое"}
        </button>
        <button
          className="admin-primary"
          type="button"
          disabled={
            busy ||
            uploading ||
            recording ||
            !target ||
            (!text.trim() && !files.length)
          }
          onClick={() => void submit()}
        >
          <Send />
          {busy ? "Отправляем…" : "Отправить"}
        </button>
      </div>
      {recording ? (
        <p role="status">
          Идёт запись · до 3 минут. Остановите, прослушайте и отправьте.
        </p>
      ) : (
        <small>Enter: отправить · Shift+Enter: новая строка · файл до 4 МБ</small>
      )}
      {files
        .filter((f) => f.type.startsWith("audio/"))
        .map((file) => (
          <audio key={file.url} src={file.url} controls preload="metadata" />
        ))}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
export function ChatFiles({ files }: { files: unknown }) {
  if (!Array.isArray(files)) return null;
  return (
    <div className="chat-files">
      {(files as ChatAttachment[]).map((file) => (
        <div key={file.url}>
          {file.type.startsWith("image/") ? (
            <a href={file.url} target="_blank" rel="noreferrer">
              <Image
                src={file.url}
                alt={file.name}
                width={300}
                height={240}
                unoptimized
              />
            </a>
          ) : file.type.startsWith("audio/") ? (
            <audio src={file.url} controls preload="metadata" />
          ) : (
            <a href={file.url} target="_blank" rel="noreferrer">
              <Paperclip />
              {file.name}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
