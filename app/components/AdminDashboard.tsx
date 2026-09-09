"use client";

import Image from "next/image";
import { Link } from "./SiteLink";
import { BarChart3, Bell, Calculator, Check, ChevronRight, CircleUserRound, Clipboard, Eye, EyeOff, Gauge, LayoutDashboard, ListChecks, LoaderCircle, LogOut, Menu, MessageSquareText, Newspaper, PackagePlus, Pencil, Percent, Plus, Search, Settings, ShieldCheck, Sparkles, Trash2, Tractor, UsersRound, Warehouse, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Lead, NewsPost, Tractor as TractorType } from "../types";
import { AdminNewsManager } from "./AdminNewsManager";
import { AdminCRM, type CrmMode } from "./AdminCRM";
import { FinanceCalculator } from "./FinanceCalculator";
import { AdminSiteSettings } from "./AdminSiteSettings";

type DashboardData = {
  actor: { id:string; email:string; display_name:string; role:"owner"|"manager"; theme:string; phone:string; avatar:string|null };
  catalog: TractorType[];
  leads: Array<Lead & Record<string, string>>;
  popular: Array<{ tractor_slug: string; views: number }>;
  totals: { views: number; visitors: number } | null;
  daily: Array<{ day: string; views: number }>;
  profile: { display_name: string; phone: string; email: string; avatar:string|null; theme:string } | null;
  posts: NewsPost[];
  popularPosts: Array<{ path: string; views: number }>;
};

const sections = [
  ["overview", "Обзор", LayoutDashboard],
  ["deals", "Сделки", Gauge],
  ["customers", "Клиенты", UsersRound],
  ["tasks", "Задачи", ListChecks],
  ["products", "Товары", Tractor],
  ["news", "Публикации", Newspaper],
  ["leads", "Заявки", MessageSquareText],
  ["analytics", "Аналитика", BarChart3],
  ["inventory", "Склад", Warehouse],
  ["calculations", "Расчёты", Calculator],
  ["costs", "Себестоимость", Percent],
  ["team", "Команда", CircleUserRound],
  ["audit", "Журнал", Clipboard],
  ["site", "Настройки сайта", Settings],
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
  const [showPassword, setShowPassword] = useState(false);

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
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "");
    const password = String(form.get("password") ?? "");
    const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    if (response.ok) { await load(); setLoading(false); return; }
    const result=await response.json().catch(()=>({})) as {error?:string};
    setLoading(false);setToast(result.error||"Неверный логин или пароль");
  }

  async function action(payload: Record<string, unknown>) {
    setLoading(true);
    const response = await fetch("/api/admin/dashboard", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setLoading(false);
    if (response.ok) { setToast("Изменения сохранены"); await load(); return true; }
    const result = await response.json().catch(() => ({})) as { error?: string };
    setToast(result.error ?? "Не удалось сохранить изменения");
    return false;
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setData(null);
  }

  if (authenticated === null) return <div className="admin-loader"><LoaderCircle className="spin" /><span>Загружаем кабинет</span></div>;
  if (!authenticated) return (
    <main className="admin-login-page">
      <div className="admin-login-glow glow-one" aria-hidden="true"/><div className="admin-login-glow glow-two" aria-hidden="true"/>
      <section className="admin-login-brand" aria-label="ATADAN CRM">
        <Image src="/atadan-logo-cropped.png" alt="ATADAN Changfa" width={360} height={125} priority />
        <div className="admin-login-story"><span><Sparkles/> ATADAN CRM</span><h2>Вся работа с техникой — в одном пространстве</h2><p>Каталог, клиенты, сделки, заявки и аналитика доступны вашей команде в защищённом кабинете.</p></div>
        <div className="admin-login-trust"><ShieldCheck/><span><strong>Защищённый вход</strong><small>Данные передаются по шифрованному соединению</small></span></div>
      </section>
      <form className="admin-login-card" onSubmit={login} aria-busy={loading}>
        <span className="admin-login-eyebrow"><i/> Панель управления</span><span className="admin-lock"><CircleUserRound size={25} /></span><h1>Добро пожаловать</h1><p>Войдите в рабочее пространство ATADAN.</p>
        <label htmlFor="admin-email"><span>Электронная почта</span><input id="admin-email" name="username" inputMode="email" required autoComplete="username" placeholder="name@company.com" aria-invalid={toast ? true : undefined} aria-describedby={toast ? "admin-login-error" : undefined}/></label>
        <label htmlFor="admin-password"><span>Пароль</span><div className="admin-password-field"><input id="admin-password" name="password" type={showPassword?"text":"password"} required autoComplete="current-password" placeholder="Введите пароль" aria-invalid={toast ? true : undefined} aria-describedby={toast ? "admin-login-error" : undefined}/><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?"Скрыть пароль":"Показать пароль"}>{showPassword?<EyeOff/>:<Eye/>}</button></div></label>
        {toast ? <div className="admin-error" id="admin-login-error" role="alert">{toast}</div> : null}
        <button type="submit" className="admin-primary" disabled={loading}>{loading ? <LoaderCircle className="spin" /> : <ShieldCheck/>} {loading?"Проверяем…":"Войти в кабинет"}</button>
        <Link href="/">← Вернуться на сайт</Link><small className="admin-login-note">Доступ только для сотрудников ATADAN</small>
      </form>
    </main>
  );

  const newLeads = data?.leads.filter((lead) => lead.status === "new").length ?? 0;
  return (
    <main className="admin-shell" data-admin-theme={data?.profile?.theme ?? "field"}>
      <aside className={`admin-sidebar ${sidebar ? "is-open" : ""}`}>
        <div className="admin-logo"><Image src="/atadan-logo-cropped.png" alt="ATADAN Changfa" width={240} height={83} /><button type="button" onClick={() => setSidebar(false)} aria-label="Закрыть меню"><X /></button></div>
        <nav>{sections.filter(([id]) => data?.actor.role === "owner" || !["products","news","leads","costs","team","audit","site"].includes(id)).map(([id, label, Icon]) => <button type="button" className={section === id ? "active" : ""} onClick={() => { setSection(id); setSidebar(false); }} key={id}><Icon size={19} />{label}{id === "leads" && newLeads ? <b>{newLeads}</b> : null}</button>)}</nav>
        <div className="admin-sidebar-footer"><AvatarVisual avatar={data?.profile?.avatar ?? null} size={38} /><div><strong>{data?.profile?.display_name ?? "Администратор"}</strong><span>{data?.profile?.email}</span></div><button type="button" onClick={logout} aria-label="Выйти"><LogOut size={18} /></button></div>
      </aside>
      <section className="admin-main">
        <header className="admin-header"><button className="admin-menu" type="button" onClick={() => setSidebar(true)} aria-label="Открыть меню"><Menu /></button><div><span>ATADAN / Панель управления</span><h1>{sections.find(([id]) => id === section)?.[1]}</h1></div><div className="admin-header-tools"><button type="button" aria-label="Уведомления"><Bell size={18} />{newLeads ? <b>{newLeads}</b> : null}</button><Link href="/" target="_blank">Открыть сайт <ChevronRight size={17} /></Link></div></header>
        {section === "overview" ? <Overview data={data} newLeads={newLeads} setSection={setSection} /> : null}
        {(["deals","customers","tasks","team","costs","audit"] as CrmMode[]).includes(section as CrmMode) ? <AdminCRM mode={section as CrmMode} catalog={data?.catalog ?? []} /> : null}
        {section === "products" ? <Products data={data} edit={setProductEditor} remove={(slug) => action({ action: "delete_product", slug })} /> : null}
        {section === "news" ? <AdminNewsManager posts={data?.posts ?? []} catalog={data?.catalog ?? []} popularPosts={data?.popularPosts ?? []} save={async (post, originalSlug) => { await action({ action: "save_news", post, originalSlug }); }} remove={async (slug) => { await action({ action: "delete_news", slug }); }} /> : null}
        {section === "leads" ? <Leads data={data} update={(id, status) => action({ action: "lead_status", id, status })} /> : null}
        {section === "analytics" ? <Analytics data={data} /> : null}
        {section === "inventory" ? <Inventory data={data} edit={setProductEditor} /> : null}
        {section === "calculations" ? <div className="admin-content"><FinanceCalculator tractors={data?.catalog ?? []} /></div> : null}
        {section === "profile" ? <Profile data={data} save={(profile) => action({ action: "save_profile", profile })} /> : null}
        {section === "site" ? <AdminSiteSettings /> : null}
      </section>
      {section === "products" ? <button type="button" className="admin-fab" onClick={() => setProductEditor(emptyProduct())}><Plus /> Добавить трактор</button> : null}
      {productEditor ? <ProductEditor product={productEditor} close={() => setProductEditor(null)} save={async (product) => { if (await action({ action: "save_product", product })) setProductEditor(null); }} /> : null}
      {toast ? <div className="admin-toast"><Check size={16} />{toast}<button type="button" onClick={() => setToast("")}><X size={14} /></button></div> : null}
    </main>
  );
}

function AvatarVisual({ avatar, size }: { avatar: string | null; size: number }) {
  return avatar ? <span className="admin-avatar-image" style={{ width: size, height: size }}><Image src={avatar} alt="Фото администратора" width={size} height={size} unoptimized /></span> : <span className="admin-avatar" style={{ width: size, height: size }}>A</span>;
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
  return <div className="admin-content"><div className="admin-panel admin-products-panel"><div className="admin-table-tools"><label><Search size={18} aria-hidden="true" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти модель" aria-label="Найти модель" /></label><span>{products.length} моделей</span></div><div className="admin-product-grid">{products.map((product) => <article className="admin-product-card" key={product.slug}>
    <div className="admin-product-media">
      {product.discountPercent ? <span className="admin-promo-tag"><Percent size={13} aria-hidden="true" />−{product.discountPercent}%</span> : null}
      <span className={`admin-product-stock ${product.inStock ? "available" : "order"}`}>{product.inStock ? "В наличии" : "Под заказ"}</span>
      <div className="admin-product-image"><Image src={product.image} alt={`Changfa ${product.model}`} width={360} height={248} /></div>
    </div>
    <div className="admin-product-summary"><span>{product.category} · {product.hp} л.с.</span><h3>Changfa {product.model}</h3><p>{product.description || "Добавьте короткое описание, чтобы карточка была полезнее покупателю."}</p><div className="admin-product-facts"><span><ListChecks size={15} aria-hidden="true" />{product.equipment?.length ? `${product.equipment.length} позиций комплектации` : "Комплектация не заполнена"}</span><span>{product.price ? `${new Intl.NumberFormat("ru-RU").format(product.price)} сом` : "Цена по запросу"}</span></div></div>
    <div className="admin-card-actions"><button type="button" onClick={() => edit(product)}><Pencil size={16} aria-hidden="true" />Изменить</button><button className="admin-delete-button" type="button" onClick={() => confirm(`Удалить ${product.model}?`) && remove(product.slug)} aria-label={`Удалить ${product.model}`}><Trash2 size={16} aria-hidden="true" /><span>Удалить</span></button></div>
  </article>)}</div></div></div>;
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

function Inventory({ data, edit }: { data: DashboardData | null; edit: (product: TractorType) => void }) {
  const catalog = data?.catalog ?? [];
  const inStock = catalog.filter((item) => item.inStock);
  const onOrder = catalog.filter((item) => !item.inStock);
  return <div className="admin-content"><div className="inventory-summary"><article><span>Всего позиций</span><strong>{catalog.length}</strong><small>в каталоге Changfa</small></article><article className="positive"><span>В наличии</span><strong>{inStock.length}</strong><small>готовы к продаже</small></article><article className="warning"><span>Под заказ</span><strong>{onOrder.length}</strong><small>ожидают поставки</small></article></div><div className="admin-panel"><div className="panel-head"><div><span>Оперативный контроль</span><h2>Статус техники</h2></div></div><div className="inventory-list">{catalog.map((product) => <button type="button" onClick={() => edit(product)} key={product.slug}><Image src={product.image} alt="" width={72} height={55} /><span><strong>{product.model}</strong><small>{product.hp} л.с. · {product.category}</small></span><i className={product.inStock ? "available" : "order"}>{product.inStock ? "В наличии" : "Под заказ"}</i><ChevronRight size={17} /></button>)}</div></div></div>;
}


function Profile({ data, save }: { data: DashboardData | null; save: (profile: { displayName: string; phone: string; avatar:string; theme:string }) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const f = new FormData(event.currentTarget); save({ displayName: String(f.get("displayName")), phone: String(f.get("phone")), avatar:String(f.get("avatar")), theme:String(f.get("theme")) }); }
  return <div className="admin-content"><form className="admin-panel profile-form" onSubmit={submit}><div className="profile-heading"><AvatarVisual avatar={data?.profile?.avatar ?? null} size={92} /><div><span className="panel-kicker">Настройки аккаунта</span><h2>Профиль сотрудника</h2><p>Данные хранятся в SQL и доступны на любом устройстве.</p></div></div><div className="profile-fields"><label><span>Имя</span><input name="displayName" defaultValue={data?.profile?.display_name} required /></label><label><span>Рабочий телефон</span><input name="phone" defaultValue={data?.profile?.phone} /></label><label><span>Email для входа</span><input value={data?.profile?.email ?? ""} readOnly /></label><label><span>Ссылка на аватар</span><input name="avatar" type="url" defaultValue={data?.profile?.avatar ?? ""} placeholder="https://…"/></label><label><span>Фон кабинета</span><select name="theme" defaultValue={data?.profile?.theme ?? "field"}><option value="field">Поле</option><option value="light">Светлый</option><option value="dark">Тёмный</option></select></label></div><button type="submit" className="admin-primary">Сохранить профиль</button></form></div>;
}

function emptyProduct(): TractorType { return { id: crypto.randomUUID(), slug: "", model: "", hp: 50, category: "Универсальные", farmArea: "до 30 га", price: null, discountPercent: null, promotionLabel: null, inStock: true, image: "/images/tractors-4k/cfb504-x.webp", images: ["/images/tractors-4k/cfb504-x.webp"], videoUrl: null, description: "", comfort: "", equipment: [], specs: {} }; }

function ProductEditor({ product, close, save }: { product: TractorType; close: () => void; save: (product: TractorType) => void }) {
  const dialogRef = useRef<HTMLFormElement>(null);
  const closeRef = useRef(close);
  useEffect(() => { closeRef.current = close; }, [close]);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const model = String(f.get("model"));
    const image = String(f.get("image")).trim();
    const images = String(f.get("images") ?? "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    const equipment = String(f.get("equipment") ?? "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    const specs = Object.fromEntries(String(f.get("specs") ?? "").split(/\r?\n/).map((line) => {
      const separator = line.indexOf(":");
      return separator > 0 ? [line.slice(0, separator).trim(), line.slice(separator + 1).trim()] : null;
    }).filter((entry): entry is [string, string] => Boolean(entry?.[0] && entry?.[1])));
    save({
      ...product,
      model,
      slug: String(f.get("slug")) || model.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      hp: Number(f.get("hp")),
      category: String(f.get("category")),
      farmArea: String(f.get("farmArea")),
      price: f.get("price") ? Number(f.get("price")) : null,
      discountPercent: f.get("discountPercent") ? Math.min(90, Math.max(0, Number(f.get("discountPercent")))) : null,
      promotionLabel: String(f.get("promotionLabel") ?? "").trim() || null,
      inStock: f.get("inStock") === "on",
      popular: f.get("popular") === "on",
      recommended: f.get("recommended") === "on",
      image,
      images: Array.from(new Set([image, ...images])),
      videoUrl: String(f.get("videoUrl") ?? "").trim() || null,
      description: String(f.get("description")),
      comfort: String(f.get("comfort")),
      equipment,
      specs,
    });
  }
  const gallery = (product.images?.length ? product.images : [product.image]).join("\n");
  const equipment = (product.equipment ?? []).join("\n");
  const specs = Object.entries(product.specs).map(([label, value]) => `${label}: ${value}`).join("\n");
  return <div className="editor-overlay"><button className="editor-backdrop" type="button" onClick={close} aria-label="Закрыть редактор" /><form ref={dialogRef} className="product-editor" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
    <header><div><span>Карточка товара</span><h2 id="product-editor-title">{product.model || "Новый трактор"}</h2></div><button type="button" onClick={close} aria-label="Закрыть"><X /></button></header>
    <div className="editor-sections">
      <fieldset><legend>Основные данные</legend><div className="editor-fields"><label><span>Модель</span><input name="model" defaultValue={product.model} required /></label><label><span>Slug</span><input name="slug" defaultValue={product.slug} placeholder="создастся автоматически" /></label><label><span>Мощность, л.с.</span><input name="hp" type="number" min="20" max="500" defaultValue={product.hp} required /></label><label><span>Категория</span><select name="category" defaultValue={product.category}><option>Универсальные</option><option>Средний класс</option><option>Тяжёлый класс</option></select></label><label><span>Площадь</span><input name="farmArea" defaultValue={product.farmArea} /></label><label className="editor-check"><input type="checkbox" name="inStock" defaultChecked={product.inStock} /><span>Есть в наличии</span></label></div></fieldset>
      <fieldset><legend>Цена и витрина</legend><div className="editor-fields"><label><span>Цена, сом</span><input name="price" type="number" min="0" defaultValue={product.price ?? ""} placeholder="Цена по запросу" /></label><label><span>Скидка, %</span><input name="discountPercent" type="number" min="0" max="90" defaultValue={product.discountPercent ?? ""} placeholder="Например, 10" /></label><label className="full"><span>Название акции</span><input name="promotionLabel" defaultValue={product.promotionLabel ?? ""} placeholder="Например: Сезонная выгода" /></label><label className="editor-check"><input type="checkbox" name="popular" defaultChecked={product.popular}/><span>Популярная модель</span></label><label className="editor-check"><input type="checkbox" name="recommended" defaultChecked={product.recommended}/><span>Рекомендуем</span></label></div></fieldset>
      <fieldset><legend>Описание и комплектация</legend><div className="editor-fields"><label className="full"><span>Описание товара</span><textarea name="description" rows={6} defaultValue={product.description} placeholder="Что умеет трактор и для каких работ подходит" required /><small>Коротко и конкретно: назначение, сильные стороны и выгода для хозяйства.</small></label><label className="full"><span>Комфорт оператора</span><textarea name="comfort" rows={4} defaultValue={product.comfort} placeholder="Кабина, посадка, обзор, органы управления" /></label><label className="full"><span>Комплектация — одна позиция на строку</span><textarea name="equipment" rows={7} defaultValue={equipment} placeholder="Кабина с отопителем&#10;Передние противовесы&#10;Гидравлические выходы" /><small>Эти пункты появятся на странице трактора отдельным понятным списком.</small></label></div></fieldset>
      <fieldset><legend>Фото и видео</legend><div className="editor-fields"><label className="full"><span>Основное изображение</span><input name="image" defaultValue={product.image} required /><small>Путь /images/... или публичная ссылка из хранилища.</small></label><label className="full"><span>Галерея — одно фото на строку</span><textarea name="images" rows={7} defaultValue={gallery} /><small>Первым будет основное изображение. Добавьте фото с разных сторон, кабины и двигателя.</small></label><label className="full"><span>Видео товара</span><input name="videoUrl" type="url" defaultValue={product.videoUrl ?? ""} placeholder="https://.../video.mp4" /><small>Видео сохранится в карточке и будет готово для будущего показа.</small></label></div></fieldset>
      <fieldset><legend>Технические характеристики</legend><div className="editor-fields"><label className="full"><span>Название: значение — одна характеристика на строку</span><textarea name="specs" rows={10} defaultValue={specs} placeholder="Модель двигателя: CF...&#10;Колёсная база: 2200 мм" /></label></div></fieldset>
    </div>
    <footer><button type="button" onClick={close}>Отмена</button><button className="admin-primary" type="submit"><Check size={17} aria-hidden="true" />Сохранить товар</button></footer>
  </form></div>;
}
