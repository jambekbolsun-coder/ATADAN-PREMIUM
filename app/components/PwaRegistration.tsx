"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PublicPwaCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.getRegistrations().then((registrations) =>
      Promise.all(
        registrations
          .filter((registration) => {
            const script = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL;
            return script ? new URL(script).pathname === "/sw.js" : false;
          })
          .map((registration) => registration.unregister()),
      ),
    ).catch(() => undefined);
    if ("caches" in window) {
      void caches.keys().then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith("atadan-public-") || key.startsWith("atadan-shell-")).map((key) => caches.delete(key))),
      ).catch(() => undefined);
    }
  }, []);
  return null;
}

export function AdminInstallButton({ role }: { role: string }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (role !== "owner" || !location.pathname.startsWith("/admin")) return;
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone) queueMicrotask(() => setInstalled(true));
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    const manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = "/admin/manifest.webmanifest";
    manifest.dataset.adminManifest = "owner";
    document.head.append(manifest);
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      void navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin/" }).catch(() => undefined);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      manifest.remove();
    };
  }, [role]);

  if (role !== "owner" || installed) return null;
  return (
    <button
      className="admin-install-button"
      type="button"
      disabled={!installPrompt}
      title={installPrompt ? "Установить ATADAN CRM" : "Установка станет доступна после проверки браузером"}
      onClick={async () => {
        if (!installPrompt) return;
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        setInstallPrompt(null);
        if (choice.outcome === "accepted") setInstalled(true);
      }}
    >
      <Download aria-hidden="true" size={18} />
      <span>Установить</span>
    </button>
  );
}
