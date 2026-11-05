/** Набор компонентов админки. Все экраны собираются только из них (см. docs/admin-redesign). */
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, CircleAlert, Info, TriangleAlert, CircleCheck } from "lucide-react";
import { Icon } from "./icons";
import type { IconKey, Tone } from "../_lib/nav";
import { initials } from "../_lib/format";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="ax-ph">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="ax-act">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, more, children, className, flush }: { title?: ReactNode; more?: { href: string; label: string }; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cn("ax-card", flush && "ax-card-flush", className)}>
      {title ? (
        <h3 className="ax-card-h" style={flush ? { padding: "14px 16px 0" } : undefined}>
          {title}
          {more ? <Link className="ax-more" href={more.href}>{more.label} →</Link> : null}
        </h3>
      ) : null}
      {children}
    </section>
  );
}

export function IconTile({ icon, tone, small }: { icon: IconKey; tone: Tone; small?: boolean }) {
  return (
    <span className={cn("ax-ic", small && "ax-ic-sm", `ax-c-${tone}`)}>
      <Icon name={icon} size={small ? 16 : 19} />
    </span>
  );
}

/** Показатель. Если есть href - вся карточка кликабельна и ведёт в список с фильтром. */
export function Stat({ label, value, hint, icon, tone, href }: { label: string; value: ReactNode; hint?: ReactNode; icon: IconKey; tone: Tone; href?: string }) {
  const body = (
    <>
      <IconTile icon={icon} tone={tone} />
      <div className="ax-kpi-l">{label}</div>
      <div className="ax-kpi-v num">{value}</div>
      {hint ? <div className="ax-kpi-h">{hint}</div> : null}
    </>
  );
  const cls = cn("ax-card ax-kpi", `ax-k-${tone}`);
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

export type Status = "good" | "warn" | "bad" | "info" | "mute";
export function Badge({ tone = "mute", children }: { tone?: Status; children: ReactNode }) {
  return <span className={cn("ax-badge", `ax-b-${tone}`)}>{children}</span>;
}

export function Tag({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={cn("ax-tag", `ax-c-${tone}`)}>{children}</span>;
}

export function ButtonLink({ href, children, variant = "default", size, className }: { href: string; children: ReactNode; variant?: "default" | "primary" | "ghost"; size?: "sm"; className?: string }) {
  return (
    <Link href={href} className={cn("ax-btn", variant === "primary" && "ax-btn-primary", variant === "ghost" && "ax-btn-ghost", size === "sm" && "ax-btn-sm", className)}>
      {children}
    </Link>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "good" | "bad"; children: ReactNode }) {
  const I = tone === "warn" ? TriangleAlert : tone === "bad" ? CircleAlert : tone === "good" ? CircleCheck : Info;
  return (
    <div className={cn("ax-notice", `ax-n-${tone}`)} role={tone === "bad" ? "alert" : undefined}>
      <I size={18} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
      <p>{children}</p>
    </div>
  );
}

/** Пустое состояние: что отсутствует и одно следующее действие. */
export function Empty({ icon = "inbox", tone = "green", title, text, action }: { icon?: IconKey; tone?: Tone; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="ax-empty">
      <IconTile icon={icon} tone={tone} />
      <h3>{title}</h3>
      {text ? <p>{text}</p> : null}
      {action}
    </div>
  );
}

export function Avatar({ name, url, size = 34 }: { name?: string | null; url?: string | null; size?: number }) {
  return (
    <span className="ax-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" /> : initials(name)}
    </span>
  );
}

/** Строка сгруппированного списка (хабы, настройки). */
export function RowLink({ href, icon, tone, label, hint, end }: { href: string; icon: IconKey; tone: Tone; label: string; hint?: string; end?: ReactNode }) {
  return (
    <Link href={href} className="ax-row">
      <IconTile icon={icon} tone={tone} small />
      <span className="ax-row-body">
        <span className="ax-row-t">{label}</span>
        {hint ? <span className="ax-row-s">{hint}</span> : null}
      </span>
      <span className="ax-row-end">
        {end}
        <ChevronRight size={18} aria-hidden />
      </span>
    </Link>
  );
}

export function Grouped({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div>
      {title ? <div className="ax-group-t">{title}</div> : null}
      <ul className="ax-grouped">{Array.isArray(children) ? children.map((c, i) => <li key={i}>{c}</li>) : <li>{children}</li>}</ul>
    </div>
  );
}

export function Progress({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="ax-prog" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      <i style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
