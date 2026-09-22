"use client";

import { ChatComposer, ChatFiles, type ChatAttachment } from "./ChatComposer";
import {
  Bell,
  CheckSquare,
  FolderKanban,
  MessageCircleMore,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Staff = {
  id: string;
  display_name: string;
  email: string;
  role: string;
  avatar: string | null;
};
type Row = {
  id: string;
  title: string;
  subtitle: string;
  created_at: string;
  created_by: string;
  version: number;
  data: Record<string, unknown>;
};
type Data = {
  actor: { id: string; display_name: string };
  staff: Staff[];
  groups: Row[];
  messages: Row[];
  notifications: {
    personal: Array<Record<string, unknown>>;
    leads: Array<Record<string, unknown>>;
    tasks: Array<Record<string, unknown>>;
    audit: Array<Record<string, unknown>>;
  };
};
export type CollaborationMode = "notifications" | "chat" | "groups";
const date = (value: unknown) =>
  new Date(String(value)).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function AdminCollaboration({ mode }: { mode: CollaborationMode }) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [target, setTarget] = useState(""),
    [notificationFilter, setNotificationFilter] = useState("Все");
  const requestVersion = useRef(0);
  const feed = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const lastConversation = useRef("");
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const version = ++requestVersion.current;
      const response = await fetch(
        `/api/admin/collaboration?scope=${mode}&target=${encodeURIComponent(target)}`,
        { cache: "no-store", signal },
      );
      const body = (await response.json()) as Data & { error?: string };
      if (!response.ok)
        throw new Error(body.error || "Не удалось загрузить раздел");
      if (version === requestVersion.current) {
        setData(body);
        setError("");
        if (!target && mode === "chat") {
          const group = new URLSearchParams(window.location.search).get(
            "group",
          );
          const selected =
            group && body.groups.some((item) => item.id === group)
              ? `group:${group}`
              : body.staff.find((person) => person.id !== body.actor.id)?.id ||
                (body.groups[0] ? `group:${body.groups[0].id}` : "");
          setTarget(selected);
        }
      }
    },
    [mode, target],
  );
  useEffect(() => {
    const controller = new AbortController();
    let timer: number;
    const refresh = async () => {
      try {
        if (document.visibilityState === "visible")
          await load(controller.signal);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Нет соединения. Повторяем загрузку…",
          );
      } finally {
        if (!controller.signal.aborted)
          timer = window.setTimeout(refresh, 5000);
      }
    };
    timer = window.setTimeout(refresh, 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [load]);
  useEffect(() => {
    if (!feed.current) return;
    if (lastConversation.current !== target || followLatest.current)
      feed.current.scrollTop = feed.current.scrollHeight;
    lastConversation.current = target;
  }, [data, target]);
  async function action(payload: Record<string, unknown>) {
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/collaboration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Не удалось сохранить");
      followLatest.current = true;
      // The write succeeded even if a following refresh temporarily fails.
      await load().catch(() =>
        setError("Сообщение сохранено. Обновляем историю…"),
      );
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сети");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const staffById = useMemo(
    () =>
      new Map(
        data?.staff.map((person) => [person.id, person.display_name]) ?? [],
      ),
    [data],
  );
  if (!data)
    return (
      <div className="admin-content">
        <section className="admin-panel admin-empty">
          <MessageCircleMore />
          <h3>{error || "Загружаем совместную работу…"}</h3>
        </section>
      </div>
    );
  if (mode === "notifications") {
    const items = [
      ...data.notifications.personal.map((item) => ({
        id: String(item.id),
        kind: "Личные",
        title: String(item.title),
        text: String(item.body || ""),
        at: item.created_at,
        icon: Bell,
        priority: String(item.priority || "normal"),
        read: Boolean(item.read_at),
        url: String(item.target_url || ""),
      })),
      ...data.notifications.leads.map((item) => ({
        id: String(item.id),
        kind: "CRM",
        title: `Новая заявка: ${item.name || "клиент"}`,
        text: [item.phone, item.tractor_slug].filter(Boolean).join(" · "),
        at: item.created_at,
        icon: MessageCircleMore,
        priority: "high",
        read: true,
        url: "/admin/marketing/site-leads",
      })),
      ...data.notifications.tasks.map((item) => ({
        id: String(item.id),
        kind: "Задачи",
        title: String(item.title),
        text: item.done ? "Выполнено" : `Срок: ${date(item.due_at)}`,
        at: item.due_at,
        icon: CheckSquare,
        priority: item.done ? "normal" : "high",
        read: true,
        url: "/admin/company/employee-tasks",
      })),
      ...data.notifications.audit.map((item) => ({
        id: String(item.id),
        kind: "Система",
        title: String(item.action),
        text: String(item.detail || item.display_name || "Изменение данных"),
        at: item.created_at,
        icon: ShieldCheck,
        priority: "normal",
        read: true,
        url: "/admin/company/audit",
      })),
    ]
      .sort(
        (a, b) =>
          new Date(String(b.at)).getTime() - new Date(String(a.at)).getTime(),
      )
      .slice(0, 200);
    const visible =
      notificationFilter === "Все"
        ? items
        : notificationFilter === "Непрочитанные"
          ? items.filter((item) => !item.read)
          : items.filter((item) => item.kind === notificationFilter);
    return (
      <div className="admin-content">
        <section className="admin-panel collaboration-panel">
          <div className="panel-head">
            <div>
              <span>Единый центр</span>
              <h2>Уведомления</h2>
              <p>
                Персональные события, приоритет и переход к связанному объекту.
              </p>
            </div>
            <b>{items.filter((item) => !item.read).length}</b>
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="notification-folders">
            {["Все", "Непрочитанные", "Личные", "CRM", "Задачи", "Система"].map(
              (kind) => (
                <button
                  type="button"
                  className={notificationFilter === kind ? "active" : ""}
                  onClick={() => setNotificationFilter(kind)}
                  key={kind}
                >
                  {kind}
                  <b>
                    {kind === "Все"
                      ? items.length
                      : kind === "Непрочитанные"
                        ? items.filter((item) => !item.read).length
                        : items.filter((item) => item.kind === kind).length}
                  </b>
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => void action({ action: "notification_read" })}
            >
              Прочитать все
            </button>
          </div>
          <div className="notification-list">
            {visible.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  className={`${item.read ? "read" : "unread"} priority-${item.priority}`}
                  key={`${item.kind}-${item.id}`}
                >
                  <i>
                    <Icon />
                  </i>
                  <div>
                    <small>
                      {item.kind} ·{" "}
                      {item.priority === "high"
                        ? "Важное"
                        : item.priority === "critical"
                          ? "Срочное"
                          : "Обычное"}
                    </small>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                    {item.url ? <a href={item.url}>Открыть объект</a> : null}
                  </div>
                  <time>{date(item.at)}</time>
                  {item.kind === "Личные" && !item.read ? (
                    <button
                      type="button"
                      onClick={() =>
                        void action({
                          action: "notification_read",
                          id: item.id,
                        })
                      }
                    >
                      Прочитано
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    );
  }
  if (mode === "groups")
    return (
      <div className="admin-content collaboration-grid">
        <section className="admin-panel collaboration-panel">
          <div className="panel-head">
            <div>
              <span>Проекты</span>
              <h2>Рабочие группы</h2>
              <p>
                Участники, рабочий объект и архивирование управляются внутри
                карточки.
              </p>
            </div>
            <FolderKanban />
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="group-list">
            {data.groups.map((group) => (
              <GroupEditor
                key={group.id}
                group={group}
                staff={data.staff}
                staffById={staffById}
                submit={action}
              />
            ))}
            {!data.groups.length ? <p>Групп пока нет.</p> : null}
          </div>
        </section>
        <GroupForm staff={data.staff} busy={busy} submit={action} />
      </div>
    );
  async function send(
    text: string,
    attachments: ChatAttachment[],
    clientId: string,
  ) {
    const isGroup = target.startsWith("group:");
    return action({
      action: "send_message",
      text,
      attachments,
      clientId,
      to: isGroup ? "" : target,
      groupId: isGroup ? target.slice(6) : "",
    });
  }
  const selectedMessages = data.messages.filter((message) =>
    target.startsWith("group:")
      ? message.data.groupId === target.slice(6)
      : target &&
        !message.data.groupId &&
        ((message.created_by === data.actor.id && message.data.to === target) ||
          (message.created_by === target && message.data.to === data.actor.id)),
  );
  return (
    <div className="admin-content">
      <section className="admin-panel collaboration-panel chat-panel">
        <div className="panel-head">
          <div>
            <span>Команда ATADAN</span>
            <h2>Чат сотрудников</h2>
            <p>
              Личные диалоги и группы разделены. В ленте только выбранный
              разговор.
            </p>
          </div>
          <Bell />
        </div>
        <label className="chat-target">
          <span>Диалог</span>
          <select
            disabled={busy}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            required
          >
            <option value="">Выберите диалог</option>
            <optgroup label="Личные диалоги">
              {data.staff
                .filter((person) => person.id !== data.actor.id)
                .map((person) => (
                  <option value={person.id} key={person.id}>
                    {person.display_name} · {person.role}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Групповые диалоги">
              {data.groups.map((group) => (
                <option value={`group:${group.id}`} key={group.id}>
                  {group.title}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <div
          className="chat-feed"
          data-lenis-prevent
          ref={feed}
          role="log"
          aria-label="История диалога"
          onScroll={(event) => {
            const node = event.currentTarget;
            followLatest.current =
              node.scrollHeight - node.scrollTop - node.clientHeight < 80;
          }}
        >
          {[...selectedMessages]
            .sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            )
            .map((message) => (
              <article
                className={message.created_by === data.actor.id ? "mine" : ""}
                key={message.id}
              >
                <small>
                  {String(
                    message.data.fromName ||
                      staffById.get(message.created_by) ||
                      "Сотрудник",
                  )}
                </small>
                <p>{String(message.data.text || message.subtitle)}</p>
                <ChatFiles files={message.data.attachments} />
                <time>{date(message.created_at)}</time>
              </article>
            ))}
          {target && !selectedMessages.length ? (
            <p>В этом диалоге пока нет сообщений.</p>
          ) : null}
          {!target ? <p>Выберите личный или групповой диалог.</p> : null}
        </div>
        <ChatComposer key={target} target={target} busy={busy} send={send} />
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function GroupEditor({
  group,
  staff,
  staffById,
  submit,
}: {
  group: Row;
  staff: Staff[];
  staffById: Map<string, string>;
  submit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const members = Array.isArray(group.data.members)
    ? (group.data.members as string[])
    : [];
  const [editing, setEditing] = useState(false),
    [confirmArchive, setConfirmArchive] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    if (
      await submit({
        action: "update_group",
        id: group.id,
        version: group.version,
        title: f.get("title"),
        description: f.get("description"),
        members: f.getAll("members"),
        linkedEntityType: f.get("linkedEntityType"),
        linkedEntityId: f.get("linkedEntityId"),
      })
    )
      setEditing(false);
  }
  return (
    <article>
      <i>
        <FolderKanban />
      </i>
      <div>
        <h3>{group.title}</h3>
        <a
          className="group-chat-link"
          href={`/admin/company/chat?group=${encodeURIComponent(group.id)}`}
        >
          Открыть чат группы
        </a>
        <p>
          {String(group.data.description || group.subtitle || "Без описания")}
        </p>
        <small>
          {members.map((id) => staffById.get(id) || "Сотрудник").join(" · ")}
        </small>
        {editing ? (
          <form onSubmit={save}>
            <input name="title" defaultValue={group.title} required />
            <textarea
              name="description"
              defaultValue={String(group.data.description || "")}
            />
            <input
              name="linkedEntityType"
              defaultValue={String(group.data.linkedEntityType || "")}
              placeholder="Тип объекта: deal / customer"
            />
            <input
              name="linkedEntityId"
              defaultValue={String(group.data.linkedEntityId || "")}
              placeholder="Связанный объект"
            />
            <fieldset>
              {staff.map((person) => (
                <label key={person.id}>
                  <input
                    name="members"
                    type="checkbox"
                    value={person.id}
                    defaultChecked={members.includes(person.id)}
                  />
                  {person.display_name}
                </label>
              ))}
            </fieldset>
            <button type="submit">Сохранить</button>
            <button type="button" onClick={() => setEditing(false)}>
              Отмена
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setEditing(true)}>
            Редактировать
          </button>
        )}
        {confirmArchive ? (
          <span>
            <button
              type="button"
              onClick={() =>
                void submit({
                  action: "archive_group",
                  id: group.id,
                  version: group.version,
                })
              }
            >
              Подтвердить архивирование
            </button>
            <button type="button" onClick={() => setConfirmArchive(false)}>
              Отмена
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmArchive(true)}>
            В архив
          </button>
        )}
      </div>
    </article>
  );
}

function GroupForm({
  staff,
  busy,
  submit,
}: {
  staff: Staff[];
  busy: boolean;
  submit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      f = new FormData(form);
    if (
      await submit({
        action: "create_group",
        title: f.get("title"),
        description: f.get("description"),
        members: f.getAll("members"),
      })
    )
      form.reset();
  }
  return (
    <form className="admin-panel group-form" onSubmit={save}>
      <div>
        <span>Новая группа</span>
        <h2>Собрать команду</h2>
      </div>
      <label>
        <span>Название</span>
        <input name="title" required maxLength={120} />
      </label>
      <label>
        <span>Описание или проект</span>
        <textarea name="description" rows={3} />
      </label>
      <fieldset>
        <legend>Участники</legend>
        {staff.map((person) => (
          <label key={person.id}>
            <input type="checkbox" name="members" value={person.id} />
            <UserRound />
            <span>
              {person.display_name}
              <small>{person.role}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <button className="admin-primary" disabled={busy} type="submit">
        <FolderKanban />
        Создать группу
      </button>
    </form>
  );
}
