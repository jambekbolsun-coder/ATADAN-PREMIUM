"use client";
import { useEffect, useState } from "react";
import { Copy, Download, Smartphone, X } from "lucide-react";

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Kind = "pending" | "installed" | "iphone" | "android" | "inapp" | "desktop";

declare global {
  interface Window { __axInstall?: Prompt | null }
}

const HIDE_KEY = "ax-install-hidden-until";
const HIDE_DAYS = 14;

function detect(): Kind {
  const nav = navigator as Navigator & { standalone?: boolean };
  if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone) return "installed";
  const ua = nav.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
  // Внутри WhatsApp, Telegram и соцсетей система не даёт поставить приложение.
  if (/WhatsApp|Telegram|Instagram|FBAN|FBAV|FB_IAB|; wv\)|MicroMessenger|TikTok|musical_ly/i.test(ua)) return "inapp";
  if (ios) return /Safari\//.test(ua) ? "iphone" : "inapp";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function useInstall() {
  const [kind, setKind] = useState<Kind>("pending");
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  useEffect(() => {
    queueMicrotask(() => { setKind(detect()); setPrompt(window.__axInstall ?? null); });
    const onPrompt = (e: Event) => { e.preventDefault(); window.__axInstall = e as Prompt; setPrompt(e as Prompt); };
    const onDone = () => { window.__axInstall = null; setPrompt(null); setKind("installed"); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onDone);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onDone); };
  }, []);
  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    window.__axInstall = null;
    setPrompt(null);
    if (choice.outcome === "accepted") setKind("installed");
  }
  return { kind, canPrompt: !!prompt, install };
}

/** Регистрирует service worker для всех сотрудников. Страницы с данными он не сохраняет. */
export function InstallSetup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const oldScope = `${location.origin}/admin/`;
    void navigator.serviceWorker.getRegistrations()
      .then((list) => Promise.all(list.filter((r) => r.scope === oldScope).map((r) => r.unregister())))
      .then(() => navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" }))
      .catch(() => undefined);
  }, []);
  return null;
}

function Steps({ kind, canPrompt, install }: { kind: Kind; canPrompt: boolean; install: () => Promise<void> }) {
  const [copied, setCopied] = useState(false);
  if (canPrompt) return <button type="button" className="ax-btn ax-btn-primary" onClick={() => void install()}><Download size={17} aria-hidden />Установить</button>;
  if (kind === "iphone") {
    return (
      <ol className="ax-small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
        <li>Откройте эту страницу в Safari.</li>
        <li>Нажмите «Поделиться» (квадрат со стрелкой вверх).</li>
        <li>Выберите «На экран Домой», затем «Добавить».</li>
        <li>Откройте значок ATADAN и войдите ещё раз: у приложения свой вход.</li>
      </ol>
    );
  }
  if (kind === "android") {
    return (
      <ol className="ax-small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
        <li>Откройте эту страницу в Chrome.</li>
        <li>Нажмите меню (три точки справа вверху).</li>
        <li>Выберите «Установить приложение» или «Добавить на главный экран».</li>
      </ol>
    );
  }
  if (kind === "inapp") {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <p className="ax-small" style={{ margin: 0 }}>Ссылка открыта внутри другого приложения, отсюда установить нельзя. Скопируйте адрес и вставьте его в Safari на iPhone или в Chrome на Android.</p>
        <button type="button" className="ax-btn ax-btn-sm" style={{ justifySelf: "start" }} onClick={() => { void navigator.clipboard?.writeText(`${location.origin}/admin`).then(() => setCopied(true)); }}><Copy size={15} aria-hidden />{copied ? "Адрес скопирован" : "Скопировать адрес"}</button>
      </div>
    );
  }
  return <p className="ax-small" style={{ margin: 0 }}>На компьютере откройте админку в Chrome или Edge и нажмите значок установки справа в адресной строке.</p>;
}

/** Строка в настройках: всегда показывает, как поставить приложение на это устройство. */
export function InstallCard() {
  const { kind, canPrompt, install } = useInstall();
  if (kind === "pending") return null;
  return (
    <section className="ax-card" style={{ marginBottom: 18 }}>
      <h3 className="ax-card-h"><Smartphone size={17} aria-hidden style={{ marginRight: 6 }} />Приложение на телефон</h3>
      {kind === "installed" ? <p className="ax-small" style={{ margin: 0 }}>Приложение уже установлено на этом устройстве.</p> : <Steps kind={kind} canPrompt={canPrompt} install={install} />}
    </section>
  );
}

/** Подсказка на телефоне, пока приложение не установлено. Скрывается на 14 дней. */
export function InstallBanner() {
  const { kind, canPrompt, install } = useInstall();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setVisible(Number(localStorage.getItem(HIDE_KEY) ?? 0) < Date.now()));
  }, []);
  if (!visible || !["iphone", "android", "inapp"].includes(kind)) return null;
  const hide = () => { localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_DAYS * 86_400_000)); setVisible(false); };
  return (
    <div className="ax-only-phone" style={{ marginBottom: 12 }}>
      <section className="ax-card" style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Smartphone size={18} aria-hidden />
          <b style={{ flex: 1 }}>Установите приложение ATADAN</b>
          <button type="button" className="ax-tap" aria-label="Скрыть подсказку" onClick={hide}><X size={16} aria-hidden /></button>
        </div>
        <Steps kind={kind} canPrompt={canPrompt} install={install} />
      </section>
    </div>
  );
}
