"use client";

import Image from "next/image";
import { Link } from "./SiteLink";
import { BarChart3, Check, ChevronRight, CircleUserRound, Gauge, LayoutDashboard, LoaderCircle, LogOut, Menu, MessageSquareText, PackagePlus, Pencil, Plus, Search, Settings, Trash2, Tractor, UsersRound, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Lead, Tractor as TractorType } from "../types";

type DashboardData = {
  catalog: TractorType[];
  leads: Array<Lead & Record<string, string>>;
  popular: Array<{ tractor_slug: string; views: number }>;
  totals: { views: number; visitors: number } | null;
  daily: Array<{ day: string; views: number }>;
  profile: { display_name: string; phone: string; email: string } | null;
};

const sections = [
  ["overview", "Обзор", LayoutDashboard],
  ["products", "Товары", Tractor],
  ["leads", "Заявки", MessageSquareText],
  ["analytics", "Аналитика", BarChart3],
  ["profile", "Профиль", Settings],
] as const;

export function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [section, setSection] = useState<(typeof sections)[number][0]>("overview");
  const [sidebar, setSidebar] = useState(false);
  const [productEditor, setProductEditor] = useState<TractorType | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
    if (response.status === 401) { setAuthenticated(false); return; }
    setData(await response.json() as DashboardData);
    setAuthenticated(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/dashboard", { cache: "no-store" }).then(async (response) => {
      if (cancelled) return;
      if (response.status === 401) { setAuthenticated(false); return; }
      setData(await response.json() as DashboardData);
      setAuthenticated(true);
    });
    return () => { cancelled = true; };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    setLoading(false);
    if (response.ok) void load();
    else setToast("Неверный пароль");
  }

  async function action(payload: Record<string, unknown>) {
    setLoading(true);
    const response = await fetch("/api/admin/dashboard", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setLoading(false);
    if (response.ok) { setToast("Изменения сохранены"); await load(); }
    else setToast("Не удалось сохранить изменения");
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setData(null);
  }

  if (authenticated === null) return <div className="admin-loader"><LoaderCircle className="spin" /><span>Загружаем кабинет</span></div>;
  if (!authenticated) return (
    <main className="admin-login-page">
      <div className="admin-login-brand"><Image src="/atadan-logo-cropped.png" alt="ATADAN Changfa" width={360} height={125} /><span>Панель управления</span></div>
      <form className="admin-login-card" onSubmit={login}>
        <span className="admin-lock"><CircleUserRound size={25} /></span><h1>Вход в админку</h1><p>Управление каталогом, заявками и аналитикой.</p>
        <label><span>Пароль</span><input name="password" type="password" required autoComplete="current-password" placeholder="Введите пароль" /></label>
        {toast ? <div className="admin-error">{toast}</div> : null}
        <button type="submit" className="admin-primary" disabled={loading}>{loading ? <LoaderCircle className="spin" /> : null} Войти</button>
        <Link href="/">← Вернуться на сайт</Link>
      </form>
    </main>
  );

  const newLeads = data?.leads.filter((lead) => lead.status === "new").length ?? 0;
  return (
    <main className="admin-shell">
      <aside className={`admin-sidebar ${sidebar ? "is-open" : ""}`}>
        <div className="admin-logo"><Image src="/atadan-logo-cropped.png" alt="ATADAN Changfa" width={240} height={83} /><button type="button" onClick={() => setSidebar(false)} aria-label="Закрыть меню"><X /></button></div>
        <nav>{sections.map(([id, label, Icon]) => <button type="button" className={section === id ? "active" : ""} onClick={() => { setSection(id); setSidebar(false); }} key={id}><Icon size={19} />{label}{id === "leads" && newLeads ? <b>{newLeads}</b> : null}</button>)}</nav>
        <div className="admin-sidebar-footer"><div className="admin-avatar">A</div><div><strong>{data?.profile?.display_name ?? "Администратор"}</strong><span>{data?.profile?.email}</span></div><button type="button" onClick={logout} aria-label="Выйти"><LogOut size={18} /></button></div>
      </aside>
      <section className="admin-main">
        <header className="admin-header"><button className="admin-menu" type="button" onClick={() => setSidebar(true)}><Menu /></button><div><span>ATADAN / Админка</span><h1>{sections.find(([id]) => id === section)?.[1]}</h1></div><Link href="/" target="_blank">Открыть сайт <ChevronRight size={17} /></Link></header>
        {section === "overview" ? <Overview data={data} newLeads={newLeads} setSection={setSection} /> : null}
        {section === "products" ? <Products data={data} edit={setProductEditor} remove={(slug) => action({ action: "delete_product", slug })} /> : null}
        {section === "leads" ? <Leads data={data} update={(id, status) => action({ action: "lead_status", id, status })} /> : null}
        {section === "analytics" ? <Analytics data={data} /> : null}
        {section === "profile" ? <Profile data={data} save={(profile) => action({ action: "save_profile", profile })} /> : null}
      </section>
      {section === "products" ? <button type="button" className="admin-fab" onClick={() => setProductEditor(emptyProduct())}><Plus /> Добавить трактор</button> : null}
      {productEditor ? <ProductEditor product={productEditor} close={() => setProductEditor(null)} save={async (product) => { await action({ action: "save_product", product }); setProductEditor(null); }} /> : null}
      {toast ? <div className="admin-toast"><Check size={16} />{toast}<button type="button" onClick={() => setToast("")}><X size={14} /></button></div> : null}
    </main>
  );
}

function Overview({ data, newLeads, setSection }: { data: DashboardData | null; newLeads: number; setSection: (value: "leads" | "products") => void }) {
  const popular = data?.popular[0];
  const model = data?.catalog.find((tractor) => tractor.slug === popular?.tractor_slug)?.model ?? "—";
  return <div className="admin-content"><div className="admin-stats"><Metric label="Просмотры" value={data?.totals?.views ?? 0} icon={Gauge} note="за всё время" /><Metric label="Посетители" value={data?.totals?.visitors ?? 0} icon={UsersRound} note="уникальные устройства" /><Metric label="Новые заявки" value={newLeads} icon={MessageSquareText} note="требуют ответа" /><Metric label="Популярная модель" value={model} icon={Tractor} note={popular ? `${popular.views} просмотров` : "нет данных"} /></div><div className="admin-two-col"><div className="admin-panel"><div className="panel-head"><div><span>Последние заявки</span><h2>Новые обращения</h2></div><button type="button" onClick={() => setSection("leads")}>Все заявки</button></div><LeadList leads={data?.leads.slice(0, 5) ?? []} /></div><div className="admin-panel quick-actions"><div className="panel-head"><div><span>Быстрые действия</span><h2>Управление</h2></div></div><button type="button" onClick={() => setSection("products")}><PackagePlus /><span><strong>Добавить технику</strong><small>Новая карточка в каталоге</small></span><ChevronRight /></button><button type="button" onClick={() => setSection("leads")}><MessageSquareText /><span><strong>Обработать заявки</strong><small>{newLeads} новых обращений</small></span><ChevronRight /></button></div></div></div>;
}

function Metric({ label, value, icon: Icon, note }: { label: string; value: string | number; icon: typeof Gauge; note: string }) { return <article className="metric-card"><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div><i><Icon size={21} /></i></article>; }

function Products({ data, edit, remove }: { data: DashboardData | null; edit: (product: TractorType) => void; remove: (slug: string) => void }) {
  const [query, setQuery] = useState("");
  const products = useMemo(() => data?.catalog.filter((p) => p.model.toLowerCase().includes(query.toLowerCase())) ?? [], [data, query]);
  return <div className="admin-content"><div className="admin-panel"><div className="admin-table-tools"><label><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти модель" /></label><span>{products.length} моделей</span></div><div className="admin-product-grid">{products.map((product) => <article key={product.slug}><div className="admin-product-image"><Image src={product.image} alt={product.model} width={260} height={190} /></div><div><span>{product.hp} л.с.</span><h3>{product.model}</h3><small>{product.inStock ? "В наличии" : "Под заказ"}</small></div><div className="admin-card-actions"><button type="button" onClick={() => edit(product)}><Pencil size={16} />Изменить</button><button type="button" onClick={() => confirm(`Удалить ${product.model}?`) && remove(product.slug)} aria-label={`Удалить ${product.model}`}><Trash2 size={16} /></button></div></article>)}</div></div></div>;
}

function Leads({ data, update }: { data: DashboardData | null; update: (id: string, status: string) => void }) {
  const [filter, setFilter] = useState("all");
  const leads = data?.leads.filter((lead) => filter === "all" || lead.status === filter) ?? [];
  return <div className="admin-content"><div className="lead-tabs">{[["all", "Все"], ["new", "Новые"], ["contacted", "В работе"], ["closed", "Закрытые"]].map(([id, label]) => <button type="button" className={filter === id ? "active" : ""} key={id} onClick={() => setFilter(id)}>{label}</button>)}</div><div className="admin-panel"><LeadList leads={leads} update={update} /></div></div>;
}

function LeadList({ leads, update }: { leads: DashboardData["leads"]; update?: (id: string, status: string) => void }) {
  if (!leads.length) return <div className="admin-empty"><MessageSquareText /><h3>Заявок пока нет</h3><p>Новые обращения появятся здесь автоматически.</p></div>;
  return <div className="lead-list">{leads.map((lead) => <article key={lead.id}><div className="lead-avatar">{lead.name.slice(0, 1).toUpperCase()}</div><div className="lead-main"><div><strong>{lead.name}</strong><span>{new Date(lead.createdAt ?? lead.created_at).toLocaleDateString("ru-RU")}</span></div><a href={`tel:${lead.phone}`}>{lead.phone}</a><p>{lead.tractorModel ?? lead.tractor_model ? `Интересуется: ${lead.tractorModel ?? lead.tractor_model}` : "Общий подбор техники"}{lead.message ? ` · ${lead.message}` : ""}</p></div>{update ? <select value={lead.status} onChange={(e) => update(lead.id, e.target.value)} aria-label="Статус заявки"><option value="new">Новая</option><option value="contacted">В работе</option><option value="closed">Закрыта</option></select> : <span className={`lead-status ${lead.status}`}>{lead.status === "new" ? "Новая" : lead.status === "contacted" ? "В работе" : "Закрыта"}</span>}</article>)}</div>;
}

function Analytics({ data }: { data: DashboardData | null }) {
  const max = Math.max(...(data?.daily.map((day) => Number(day.views)) ?? [1]), 1);
  return <div className="admin-content"><div className="admin-stats"><Metric label="Всего просмотров" value={data?.totals?.views ?? 0} icon={Gauge} note="с запуска сайта" /><Metric label="Уникальные посетители" value={data?.totals?.visitors ?? 0} icon={UsersRound} note="по устройствам" /><Metric label="Интерес к моделям" value={data?.popular.reduce((sum, item) => sum + Number(item.views), 0) ?? 0} icon={Tractor} note="просмотров карточек" /></div><div className="admin-two-col"><div className="admin-panel"><div className="panel-head"><div><span>Последние 7 дней</span><h2>Трафик сайта</h2></div></div><div className="bar-chart">{data?.daily.map((day) => <div key={day.day}><span style={{ height: `${Math.max(8, Number(day.views) / max * 100)}%` }} title={`${day.views} просмотров`} /><small>{new Date(day.day).toLocaleDateString("ru-RU", { weekday: "short" })}</small></div>)}</div></div><div className="admin-panel"><div className="panel-head"><div><span>Модели</span><h2>Что смотрят чаще</h2></div></div><ol className="popular-list">{data?.popular.map((item, index) => <li key={item.tractor_slug}><b>{index + 1}</b><span>{data.catalog.find((p) => p.slug === item.tractor_slug)?.model ?? item.tractor_slug}</span><strong>{item.views}</strong></li>)}</ol></div></div></div>;
}

function Profile({ data, save }: { data: DashboardData | null; save: (profile: { displayName: string; phone: string; email: string }) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const f = new FormData(event.currentTarget); save({ displayName: String(f.get("displayName")), phone: String(f.get("phone")), email: String(f.get("email")) }); }
  return <div className="admin-content"><form className="admin-panel profile-form" onSubmit={submit}><div className="profile-avatar">A</div><div><span className="panel-kicker">Настройки</span><h2>Профиль администратора</h2></div><label><span>Имя</span><input name="displayName" defaultValue={data?.profile?.display_name} required /></label><label><span>Рабочий телефон</span><input name="phone" defaultValue={data?.profile?.phone} required /></label><label><span>Email</span><input name="email" type="email" defaultValue={data?.profile?.email} required /></label><button type="submit" className="admin-primary">Сохранить профиль</button></form></div>;
}

function emptyProduct(): TractorType { return { id: crypto.randomUUID(), slug: "", model: "", hp: 50, category: "Универсальные", farmArea: "до 30 га", price: null, inStock: true, image: "/images/tractors/cfb504-x.png", description: "", comfort: "", specs: {} }; }

function ProductEditor({ product, close, save }: { product: TractorType; close: () => void; save: (product: TractorType) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const f = new FormData(event.currentTarget); const model = String(f.get("model")); save({ ...product, model, slug: String(f.get("slug")) || model.toLowerCase().replace(/[^a-z0-9]+/g, "-"), hp: Number(f.get("hp")), category: String(f.get("category")), farmArea: String(f.get("farmArea")), price: f.get("price") ? Number(f.get("price")) : null, inStock: f.get("inStock") === "on", image: String(f.get("image")), description: String(f.get("description")), comfort: String(f.get("comfort")) }); }
  return <div className="editor-overlay"><button className="editor-backdrop" type="button" onClick={close} aria-label="Закрыть редактор" /><form className="product-editor" onSubmit={submit}><header><div><span>Карточка товара</span><h2>{product.model || "Новый трактор"}</h2></div><button type="button" onClick={close}><X /></button></header><div className="editor-fields"><label><span>Модель</span><input name="model" defaultValue={product.model} required /></label><label><span>Slug</span><input name="slug" defaultValue={product.slug} placeholder="создастся автоматически" /></label><label><span>Мощность, л.с.</span><input name="hp" type="number" min="20" max="500" defaultValue={product.hp} required /></label><label><span>Категория</span><select name="category" defaultValue={product.category}><option>Универсальные</option><option>Средний класс</option><option>Тяжёлый класс</option></select></label><label><span>Площадь</span><input name="farmArea" defaultValue={product.farmArea} /></label><label><span>Цена, сом</span><input name="price" type="number" defaultValue={product.price ?? ""} placeholder="Цена по запросу" /></label><label className="full"><span>Изображение</span><input name="image" defaultValue={product.image} required /></label><label className="full"><span>Описание</span><textarea name="description" rows={4} defaultValue={product.description} /></label><label className="full"><span>Комфорт</span><textarea name="comfort" rows={3} defaultValue={product.comfort} /></label><label className="editor-check full"><input type="checkbox" name="inStock" defaultChecked={product.inStock} /><span>Есть в наличии</span></label></div><footer><button type="button" onClick={close}>Отмена</button><button className="admin-primary" type="submit">Сохранить</button></footer></form></div>;
}
