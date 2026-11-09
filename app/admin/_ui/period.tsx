import Link from "next/link";

/** Период отчёта из ?from=&to= (по умолчанию: текущий месяц). */
export function periodFrom(sp: Record<string, string | string[] | undefined>) {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const ok = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
  const now = new Date(Date.now() + 6 * 3_600_000); // дата по Бишкеку
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  let from = ok(sp.from) ? String(sp.from) : iso(first);
  let to = ok(sp.to) ? String(sp.to) : iso(now);
  if (from > to) [from, to] = [to, from];
  return { from, to };
}

function presets() {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const now = new Date(Date.now() + 6 * 3_600_000); // дата по Бишкеку
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  const q = Math.floor(m / 3) * 3;
  return [
    { label: "Этот месяц", from: iso(new Date(Date.UTC(y, m, 1))), to: iso(now) },
    { label: "Прошлый месяц", from: iso(new Date(Date.UTC(y, m - 1, 1))), to: iso(new Date(Date.UTC(y, m, 0))) },
    { label: "Квартал", from: iso(new Date(Date.UTC(y, q, 1))), to: iso(now) },
    { label: "Год", from: iso(new Date(Date.UTC(y, 0, 1))), to: iso(now) },
  ];
}

export function PeriodBar({ base, from, to }: { base: string; from: string; to: string }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
      <nav className="ax-tabs" aria-label="Период" style={{ marginBottom: 0, flex: "1 1 320px" }}>
        {presets().map((p) => (
          <Link key={p.label} href={`${base}?from=${p.from}&to=${p.to}`} aria-current={p.from === from && p.to === to ? "page" : undefined}>{p.label}</Link>
        ))}
      </nav>
      <form style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input type="date" name="from" defaultValue={from} className="ax-input" style={{ maxWidth: 160 }} aria-label="С даты" />
        <input type="date" name="to" defaultValue={to} className="ax-input" style={{ maxWidth: 160 }} aria-label="По дату" />
        <button className="ax-btn">Показать</button>
      </form>
    </div>
  );
}
