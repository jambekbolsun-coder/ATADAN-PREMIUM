"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Tractor } from "../types";
import { useI18n } from "./I18n";

const modelVideoSlugs: Record<string, string> = {
  CFG1600: "cfg1600",
  "CFG1600-H": "cfg1600-h",
  "CFG1604-A": "cfg1604-a",
  "CFH1604-M": "cfh1604-m",
  "CFH1804-M": "cfh1804-m",
  "CFJ1804(G4)": "cfj1804-g4",
  "CFJ2004(G4)": "cfj2004-g4",
  "CFJ2204(G4)": "cfj2204-g4",
  "CFK2304(G4)": "cfk2304-g4",
  "CFK2404(G4)": "cfk2404-g4",
};

type VideoQuality = "hd" | "sd";
type NetworkInformation = EventTarget & {
  downlink?: number;
  effectiveType?: string;
  saveData?: boolean;
};

function connectionQuality(): VideoQuality {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!connection) return "hd";
  if (connection.saveData) return "sd";
  if (connection.effectiveType && connection.effectiveType !== "4g") return "sd";
  if (typeof connection.downlink === "number" && connection.downlink < 3) return "sd";
  return "hd";
}

export function ProductVideo({ tractor }: { tractor: Tractor }) {
  const [failed, setFailed] = useState(false);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [visible, setVisible] = useState(false);
  const [quality, setQuality] = useState<VideoQuality | null>(null);
  const ref = useRef<HTMLVideoElement>(null);
  const visibleRef = useRef(false);
  const { locale } = useI18n();
  const videoSlug = modelVideoSlugs[tractor.model];
  const url = tractor.videoUrl || (videoSlug && quality ? `/videos/models/${quality}/${videoSlug}-10s.mp4` : null);

  useEffect(() => {
    if (tractor.videoUrl) return;
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    const update = () => setQuality(connectionQuality());
    const frame = requestAnimationFrame(update);
    connection?.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frame);
      connection?.removeEventListener("change", update);
    };
  }, [tractor.videoUrl]);

  useEffect(() => {
    const video = ref.current;
    if (!video || !url) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sync = () => {
      if (visibleRef.current && !document.hidden && !pausedByUser && !reduced) void video.play().catch(() => undefined);
      else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      const inView = entry.isIntersecting && entry.intersectionRatio >= 0.45;
      visibleRef.current = inView;
      setVisible(inView);
      sync();
    }, { threshold: [0, 0.45, 0.8] });
    observer.observe(video);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      video.pause();
    };
  }, [pausedByUser, url]);

  if ((!tractor.videoUrl && !videoSlug) || tractor.hp < 160 || tractor.hp > 240) return null;

  const title = {
    ru: `Changfa ${tractor.model} в деталях`,
    ky: `Changfa ${tractor.model} толук көрүнүшү`,
    en: `Changfa ${tractor.model} up close`,
  }[locale];
  const note = {
    ru: `Это наша модель Changfa ${tractor.model}. В интерактивном видео крупным планом показаны кабина, обзор и комфорт рабочего места оператора.`,
    ky: `Бул биздин Changfa ${tractor.model} модели. Интерактивдүү видеодо кабина, көрүнүш жана оператордун иш ордундагы комфорт жакындан көрсөтүлөт.`,
    en: `This is our Changfa ${tractor.model}. The interactive video shows the cab, visibility and operator comfort up close.`,
  }[locale];
  const pauseLabel = {
    ru: pausedByUser ? "Продолжить видео" : "Поставить видео на паузу",
    ky: pausedByUser ? "Видеону улантуу" : "Видеону токтотуу",
    en: pausedByUser ? "Resume video" : "Pause video",
  }[locale];
  const effectiveQuality = tractor.videoUrl ? "hd" : quality;
  const qualityLabel = effectiveQuality === null ? "AUTO" : effectiveQuality === "sd" ? "AUTO · DATA" : "AUTO · FULL HD";

  function toggle() {
    const video = ref.current;
    if (!video) return;
    setPausedByUser((value) => {
      const next = !value;
      if (next) video.pause();
      else if (visible && !document.hidden) void video.play().catch(() => undefined);
      return next;
    });
  }

  return (
    <section className="product-video section-shell">
      <header>
        <span className="section-label">CHANGFA · ВИДЕО МОДЕЛИ</span>
        <h2>{title}</h2>
        <p>{note}</p>
      </header>
      {failed ? (
        <a className="text-link product-video-error" href="https://en.changfanz.com/archives/Tractor/15.html" target="_blank" rel="noreferrer">{title} ↗</a>
      ) : (
        <div className="product-video-stage">
          <video ref={ref} src={url ?? undefined} poster={tractor.image} muted loop playsInline preload={url ? "metadata" : "none"} onError={() => setFailed(true)} aria-label={title} />
          <span className="product-video-model">Changfa <strong>{tractor.model}</strong></span>
          <span className="product-video-quality" aria-label="Автоматическое качество видео">10 СЕК · {qualityLabel}</span>
          <button type="button" onClick={toggle} aria-label={pauseLabel}>{pausedByUser ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}<span>{pauseLabel}</span></button>
        </div>
      )}
    </section>
  );
}
