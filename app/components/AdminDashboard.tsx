"use client";

import Image from "next/image";
import { Link } from "./SiteLink";
import { BarChart3, Bell, Bot, Calculator, Check, ChevronRight, CircleHelp, CircleUserRound, Clipboard, Eye, EyeOff, FileText, Gauge, Images, Landmark, LayoutDashboard, ListChecks, LoaderCircle, LogOut, MapPinned, Menu, MessageSquareText, Newspaper, PackageSearch, Pencil, Percent, Plus, Search, Settings, ShieldCheck, Sparkles, Star, Tags, Tractor, Trash2, TrendingUp, Truck, UsersRound, Warehouse, Wrench, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Lead, NewsPost, Tractor as TractorType } from "../types";
import { AdminNewsManager } from "./AdminNewsManager";
import { AdminCRM, type CrmMode } from "./AdminCRM";
import { AdminSiteSettings } from "./AdminSiteSettings";
import { AdminPortalHome, type AdminWorkspace } from "./AdminPortalHome";
import { AdminWorkspaceOverview } from "./AdminWorkspaceOverview";
import { AdminRecordsManager, type RecordKind } from "./AdminRecordsManager";

type DashboardData = {
  actor: { id:string; email:string; display_name:string; role:"owner"|"director"|"manager"|"accountant"|"marketer"; theme:string; phone:string; avatar:string|null };
  catalog: TractorType[];
  leads: Array<Lead & Record<string, string>>;
  popular: Array<{ tractor_slug: string; views: number }>;
  totals: { views: number; visitors: number } | null;
  daily: Array<{ day: string; views: number }>;
  profile: { display_name: string; phone: string; email: string; avatar:string|null; theme:string } | null;
  posts: NewsPost[];
  popularPosts: Array<{ path: string; views: number }>;
  director?: {
    deals?: { total:number; active:number; won:number; revenue_minor:number; profit_minor:number } | null;
    tasks?: { total:number; open:number; overdue:number } | null;
    pipeline?: Array<{ stage:string; count:number; amount_minor:number }>;
    period?: { views_30:number; visitors_30:number; leads_30:number } | null;
    goals?: { sales:number; revenueMinor:number; profitMinor:number; leads:number; meetings:number; conversion:number };
    operations?: { stock_units:number;active_shipments:number;meetings_30:number;income_som:number;expenses_som:number;debts_som:number;stock_value_som:number } | null;
    models?: Array<{tractor_slug:string;views:number;leads:number;meetings:number;sales:number;revenue_minor:number;profit_minor:number}>;
    channels?: Array<{source:string;leads:number;sales:number;revenue_minor:number;profit_minor:number}>;
    managers?: Array<{id:string;display_name:string;deals:number;sales:number;revenue_minor:number;open_tasks:number}>;
    comparison?: {leads_current:number;leads_previous:number;sales_current:number;sales_previous:number;revenue_current_minor:number;revenue_previous_minor:number;profit_current_minor:number;profit_previous_minor:number;expenses_current_som:number;expenses_previous_som:number}|null;
  };
};

type SectionDef={id:string;label:string;icon:typeof LayoutDashboard;kind?:RecordKind;ownerOnly?:boolean};
const workspaceSections:Record<AdminWorkspace,SectionDef[]>={
  marketing:[
    {id:"overview",label:"Обзор",icon:LayoutDashboard},{id:"home",label:"Главная и баннеры",icon:LayoutDashboard,kind:"home_sections"},{id:"catalog",label:"Каталог",icon:Tractor},{id:"categories",label:"Категории",icon:Tags,kind:"categories"},{id:"news",label:"Публикации",icon:Newspaper},{id:"promotions",label:"Акции",icon:Percent,kind:"promotions"},{id:"parts",label:"Запчасти",icon:PackageSearch,kind:"parts"},{id:"attachments",label:"Навесное оборудование",icon:Truck,kind:"attachments"},{id:"gallery",label:"Галерея",icon:Images,kind:"gallery"},{id:"reviews",label:"Отзывы",icon:Star,kind:"reviews"},{id:"faq",label:"FAQ",icon:CircleHelp,kind:"faq"},{id:"branches",label:"Контакты и филиалы",icon:MapPinned,kind:"branches"},{id:"leasing",label:"Лизинг и рассрочка",icon:Landmark,kind:"leasing_terms"},{id:"public-service",label:"Публичный сервис",icon:Wrench,kind:"service_pages"},{id:"site-leads",label:"Заявки с сайта",icon:MessageSquareText},{id:"site-analytics",label:"Аналитика сайта",icon:BarChart3},{id:"site-settings",label:"Настройки сайта",icon:Settings},{id:"profile",label:"Профиль",icon:CircleUserRound},
  ],
  company:[
    {id:"overview",label:"Dashboard",icon:LayoutDashboard},{id:"deals",label:"Сделки",icon:Gauge},{id:"customers",label:"Клиенты",icon:UsersRound},{id:"reservations",label:"Бронирования",icon:Clipboard,kind:"reservations"},{id:"sales",label:"Продажи",icon:TrendingUp,kind:"sales"},{id:"inventory-units",label:"Склад техники",icon:Warehouse,kind:"inventory_units"},{id:"stock-parts",label:"Склад запчастей",icon:PackageSearch,kind:"stock_parts"},{id:"stock-attachments",label:"Склад оборудования",icon:Truck,kind:"stock_attachments"},{id:"stock-movements",label:"Движения склада",icon:ListChecks,kind:"stock_movements"},{id:"suppliers",label:"Поставщики",icon:UsersRound,kind:"suppliers"},{id:"purchases",label:"Закупки",icon:Clipboard,kind:"purchases"},{id:"shipments",label:"Поставки и логистика",icon:Truck,kind:"shipments"},{id:"finance",label:"Доходы и расходы",icon:Calculator,kind:"finance_entries",ownerOnly:true},{id:"debts",label:"Задолженности",icon:Percent,kind:"debts",ownerOnly:true},{id:"installments",label:"Рассрочки",icon:Landmark,kind:"installments",ownerOnly:true},{id:"payroll",label:"Зарплаты и бонусы",icon:Calculator,kind:"payroll",ownerOnly:true},{id:"documents",label:"Документы",icon:FileText,kind:"documents"},{id:"service-cases",label:"Сервис и гарантия",icon:Wrench,kind:"service_cases"},{id:"manager-plans",label:"Планы менеджеров",icon:Gauge,kind:"manager_plans"},{id:"meetings",label:"Встречи",icon:UsersRound,kind:"meetings"},{id:"payments",label:"Платежи",icon:Calculator,kind:"payments"},{id:"tasks",label:"Задачи",icon:ListChecks},{id:"team",label:"Сотрудники",icon:CircleUserRound,ownerOnly:true},{id:"costs",label:"Себестоимость",icon:Percent,ownerOnly:true},{id:"audit",label:"Журнал действий",icon:Clipboard,ownerOnly:true},{id:"profile",label:"Профиль",icon:Settings},
  ],
  control:[
    {id:"overview",label:"Сводка директора",icon:LayoutDashboard},{id:"control-plan",label:"План / факт",icon:Gauge},{id:"control-models",label:"Аналитика моделей",icon:Tractor},{id:"control-demand",label:"Спрос и регионы",icon:MapPinned},{id:"control-stock",label:"Риски склада",icon:Warehouse},{id:"control-managers",label:"Менеджеры",icon:UsersRound},{id:"control-attribution",label:"Сквозная аналитика",icon:BarChart3},{id:"control-forecast",label:"Прогноз",icon:TrendingUp},{id:"control-ai",label:"AI-директор",icon:Bot},{id:"profile",label:"Профиль",icon:Settings},
  ],
};
type SectionId=string;
const workspaceNames:Record<AdminWorkspace,string>={marketing:"Маркетинг",company:"Управление компанией",control:"Центр управления"};

export function AdminDashboard({initialWorkspace=null,initialSection="overview"}:{initialWorkspace?:AdminWorkspace|null;initialSection?:string}={}) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [section, setSection] = useState<SectionId>(initialSection);
  const [workspace, setWorkspace] = useState<AdminWorkspace | null>(initialWorkspace);
  const [sidebar, setSidebar] = useState(false);
  const [productEditor, setProductEditor] = useState<TractorType | null>(null);
  const [toast, setToast] = useState("");
  const [dashboardError,setDashboardError]=useState("");
  const [showPassword, setShowPassword] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
    if (response.status === 401) { setAuthenticated(false); return; }
    const result=await response.json().catch(()=>({})) as DashboardData&{error?:string};
    if(!response.ok){setDashboardError(result.error||"Не удалось загрузить кабинет");setAuthenticated(true);return}
    setDashboardError("");setData(result);
    setAuthenticated(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/dashboard", { cache: "no-store" }).then(async (response) => {
      if (cancelled) return;
      if (response.status === 401) { setAuthenticated(false); return; }
      const result=await response.json().catch(()=>({})) as DashboardData&{error?:string};
      if(!response.ok){setDashboardError(result.error||"Не удалось загрузить кабинет");setAuthenticated(true);return}
      setDashboardError("");setData(result);
      setAuthenticated(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handlePopState=()=>{
      const parts=window.location.pathname.split("/").filter(Boolean);
      if(parts[0]!=="admin"){return}
      const nextWorkspace=(["marketing","company","control"] as const).find(value=>value===parts[1])??null;
      setWorkspace(nextWorkspace);
      setSection(parts[2]||"overview");
    };
    window.addEventListener("popstate",handlePopState);
    return()=>window.removeEventListener("popstate",handlePopState);
  },[]);

  function openWorkspace(choice:AdminWorkspace){setWorkspace(choice);setSection("overview");window.history.pushState({},"",`/admin/${choice}/overview`)}
  function openSection(id:string){if(!workspace)return;setSection(id);setSidebar(false);window.history.pushState({},"",`/admin/${workspace}/${id}`)}
  function closeWorkspace(){setWorkspace(null);setSection("overview");setSidebar(false);window.history.pushState({},"","/admin")}

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "");
    const password = String(form.get("password") ?? "");
    const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    if (response.ok) { setToast(""); await load(); setLoading(false); return; }
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
    setWorkspace(null);
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
        <label htmlFor="admin-password"><span>Пароль</span><div className="admin-password-field"><input id="admin-password" name="password" aria-label="Пароль" type={showPassword?"text":"password"} required autoComplete="current-password" placeholder="Введите пароль" aria-invalid={toast ? true : undefined} aria-describedby={toast ? "admin-login-error" : undefined}/><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?"Скрыть пароль":"Показать пароль"}>{showPassword?<EyeOff/>:<Eye/>}</button></div></label>
        {toast ? <div className="admin-error" id="admin-login-error" role="alert">{toast}</div> : null}
        <button type="submit" className="admin-primary" disabled={loading}>{loading ? <LoaderCircle className="spin" /> : <ShieldCheck/>} {loading?"Проверяем…":"Войти в кабинет"}</button>
        <Link href="/">← Вернуться на сайт</Link><small className="admin-login-note">Доступ только для сотрудников ATADAN</small>
      </form>
    </main>
  );

  if (!data) return <div className="admin-loader">{dashboardError?<><ShieldCheck/><span>{dashboardError}</span><button type="button" onClick={()=>void load()}>Повторить</button></>:<><LoaderCircle className="spin" /><span>Загружаем данные</span></>}</div>;
  if (!workspace) return <AdminPortalHome actor={data.actor} onChoose={openWorkspace} onLogout={logout}/>;
  const newLeads = data?.leads.filter((lead) => lead.status === "new").length ?? 0;
  const director=data.actor.role==="owner"||data.actor.role==="director";
  const visibleSections=workspaceSections[workspace].filter(item=>!item.ownerOnly||director);
  const activeDefinition=visibleSections.find(item=>item.id===section)??visibleSections[0];
  const renderedSection=activeDefinition?.id??"overview";
  return (
    <main className="admin-shell" data-admin-theme={data.profile?.theme ?? "field"} data-workspace={workspace}>
      <aside className={`admin-sidebar ${sidebar ? "is-open" : ""}`}>
        <div className="admin-logo"><Image src="/atadan-logo-cropped.png" alt="ATADAN Changfa" width={240} height={83} /><button type="button" onClick={() => setSidebar(false)} aria-label="Закрыть меню"><X /></button></div>
        <button className="workspace-back" type="button" onClick={closeWorkspace}>← Все пространства</button>
        <span className="workspace-sidebar-label">{workspaceNames[workspace]}</span>
        <nav>{visibleSections.map(({id,label,icon:Icon}) => <button type="button" className={renderedSection === id ? "active" : ""} onClick={() => openSection(id)} key={id}><Icon size={19} />{label}{id === "site-leads" && newLeads ? <b>{newLeads}</b> : null}</button>)}</nav>
        <div className="admin-sidebar-footer"><AvatarVisual avatar={data?.profile?.avatar ?? null} size={38} /><div><strong>{data?.profile?.display_name ?? "Администратор"}</strong><span>{data?.profile?.email}</span></div><button type="button" onClick={logout} aria-label="Выйти"><LogOut size={18} /></button></div>
      </aside>
      <section className="admin-main">
        <header className="admin-header"><button className="admin-menu" type="button" onClick={() => setSidebar(true)} aria-label="Открыть меню"><Menu /></button><div><span>ATADAN / {workspaceNames[workspace]}</span><h1>{activeDefinition?.label}</h1></div><div className="admin-header-tools"><button type="button" onClick={()=>workspace==="marketing"?openSection("site-leads"):workspace==="company"?openSection("tasks"):window.location.assign("/admin/company/tasks")} aria-label="Уведомления"><Bell size={18} />{newLeads ? <b>{newLeads}</b> : null}</button><Link href="/" target="_blank">Открыть сайт <ChevronRight size={17} /></Link></div></header>
        {renderedSection === "overview" ? <AdminWorkspaceOverview workspace={workspace} data={data} onNavigate={openSection} onSaveGoals={async goals=>action({action:"save_goals",goals})}/> : null}
        {(["deals","customers","tasks","team","costs","audit"] as CrmMode[]).includes(renderedSection as CrmMode) ? <AdminCRM mode={renderedSection as CrmMode} catalog={data?.catalog ?? []} /> : null}
        {renderedSection === "catalog" ? <Products data={data} edit={setProductEditor} remove={(slug) => action({ action: "delete_product", slug })} /> : null}
        {renderedSection === "news" ? <AdminNewsManager posts={data?.posts ?? []} catalog={data?.catalog ?? []} popularPosts={data?.popularPosts ?? []} save={async (post, originalSlug) => { await action({ action: "save_news", post, originalSlug }); }} remove={async (slug) => { await action({ action: "delete_news", slug }); }} /> : null}
        {renderedSection === "site-leads" ? <Leads data={data} update={(id, status) => action({ action: "lead_status", id, status })} /> : null}
        {renderedSection === "site-analytics" ? <Analytics data={data} /> : null}
        {renderedSection === "profile" ? <Profile data={data} save={(profile) => action({ action: "save_profile", profile })} /> : null}
        {renderedSection === "site-settings" ? <AdminSiteSettings /> : null}
        {activeDefinition?.kind ? <AdminRecordsManager key={activeDefinition.kind} kind={activeDefinition.kind}/> : null}
        {workspace==="control"&&renderedSection!=="overview"?<DirectorDetail section={renderedSection} data={data} onNavigate={openSection}/>:null}
      </section>
      {renderedSection === "catalog" ? <button type="button" className="admin-fab" onClick={() => setProductEditor(emptyProduct())}><Plus /> Добавить трактор</button> : null}
      {productEditor ? <ProductEditor product={productEditor} close={() => setProductEditor(null)} save={async (product) => { if (await action({ action: "save_product", product })) setProductEditor(null); }} /> : null}
      {toast ? <div className="admin-toast"><Check size={16} />{toast}<button type="button" onClick={() => setToast("")}><X size={14} /></button></div> : null}
    </main>
  );
}

function AvatarVisual({ avatar, size }: { avatar: string | null; size: number }) {
  return avatar ? <span className="admin-avatar-image" style={{ width: size, height: size }}><Image src={avatar} alt="Фото администратора" width={size} height={size} unoptimized /></span> : <span className="admin-avatar" style={{ width: size, height: size }}>A</span>;
}

function Metric({ label, value, icon: Icon, note }: { label: string; value: string | number; icon: typeof Gauge; note: string }) { return <article className="metric-card"><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div><i><Icon size={21} /></i></article>; }

function Products({ data, edit, remove }: { data: DashboardData | null; edit: (product: TractorType) => void; remove: (slug: string) => void }) {
  const [query, setQuery] = useState("");
  const [status,setStatus]=useState("all"),[sort,setSort]=useState("power-desc"),[page,setPage]=useState(1);const pageSize=12;
  const products = useMemo(() => {const result=data?.catalog.filter((p) => p.model.toLowerCase().includes(query.toLowerCase())&&(status==="all"||(p.status??"published")===status)) ?? [];return result.toSorted((a,b)=>sort==="power-desc"?b.hp-a.hp:sort==="power-asc"?a.hp-b.hp:a.model.localeCompare(b.model));}, [data, query,status,sort]);
  const shown=products.slice((page-1)*pageSize,page*pageSize),pages=Math.max(1,Math.ceil(products.length/pageSize));
  return <div className="admin-content"><div className="admin-panel admin-products-panel"><div className="admin-table-tools"><label><Search size={18} aria-hidden="true" /><input value={query} onChange={(e) => {setQuery(e.target.value);setPage(1)}} placeholder="Найти модель" aria-label="Найти модель" /></label><select value={status} onChange={event=>{setStatus(event.target.value);setPage(1)}} aria-label="Статус каталога"><option value="all">Все статусы</option><option value="published">Опубликовано</option><option value="draft">Черновик</option><option value="hidden">Скрыто</option><option value="archived">Архив</option></select><select value={sort} onChange={event=>{setSort(event.target.value);setPage(1)}} aria-label="Сортировка каталога"><option value="power-desc">Мощные сначала</option><option value="power-asc">Маломощные сначала</option><option value="name">По названию</option></select><span>{products.length} моделей</span></div><div className="admin-product-grid">{shown.map((product) => <article className="admin-product-card" key={product.slug}>
    <div className="admin-product-media">
      {product.discountPercent ? <span className="admin-promo-tag"><Percent size={13} aria-hidden="true" />−{product.discountPercent}%</span> : null}
      <span className={`admin-product-stock ${product.inStock ? "available" : "order"}`}>{product.inStock ? "В наличии" : "Под заказ"}</span>
      <div className="admin-product-image"><Image src={product.image} alt={`Changfa ${product.model}`} width={360} height={248} /></div>
    </div>
    <div className="admin-product-summary"><span>{product.category} · {product.hp} л.с. · {product.status==="draft"?"Черновик":product.status==="hidden"?"Скрыто":product.status==="archived"?"Архив":"Опубликовано"}</span><h3>Changfa {product.model}</h3><p>{product.description || "Добавьте короткое описание, чтобы карточка была полезнее покупателю."}</p><div className="admin-product-facts"><span><ListChecks size={15} aria-hidden="true" />{product.equipment?.length ? `${product.equipment.length} позиций комплектации` : "Комплектация не заполнена"}</span><span>{product.price ? `${new Intl.NumberFormat("ru-RU").format(product.price)} сом` : "Цена по запросу"}</span></div></div>
    <div className="admin-card-actions"><button type="button" onClick={() => edit(product)}><Pencil size={16} aria-hidden="true" />Изменить</button><button className="admin-delete-button" type="button" onClick={() => confirm(`Удалить ${product.model}?`) && remove(product.slug)} aria-label={`Удалить ${product.model}`}><Trash2 size={16} aria-hidden="true" /><span>Удалить</span></button></div>
  </article>)}</div><footer className="records-pagination"><span>Страница {page} из {pages}</span><div><button type="button" disabled={page<=1} onClick={()=>setPage(value=>value-1)}><ChevronRight style={{transform:"rotate(180deg)"}}/></button><button type="button" disabled={page>=pages} onClick={()=>setPage(value=>value+1)}><ChevronRight/></button></div></footer></div></div>;
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

function DirectorDetail({section,data,onNavigate}:{section:string;data:DashboardData;onNavigate:(section:string)=>void}){
  const director=data.director??{};const deals=director.deals;const operations=director.operations;const models=director.models??[];const channels=director.channels??[];const managers=director.managers??[];
  const money=(minor:number|undefined)=>new Intl.NumberFormat("ru-RU").format(Math.round((Number(minor)||0)/100))+" сом";
  const conversion=(director.period?.leads_30??0)>0?Math.round((deals?.won??0)/(director.period?.leads_30??1)*1000)/10:0;
  if(section==="control-plan")return <div className="admin-content"><section className="admin-panel director-page"><PageHeading title="План / факт" text="Цели сравниваются только с фактическими данными SQL."/><div className="director-facts"><Fact label="Продажи" fact={deals?.won??0} plan={director.goals?.sales??0}/><Fact label="Выручка" fact={Math.round((deals?.revenue_minor??0)/100)} plan={Math.round((director.goals?.revenueMinor??0)/100)} money/><Fact label="Прибыль" fact={Math.round((deals?.profit_minor??0)/100)} plan={Math.round((director.goals?.profitMinor??0)/100)} money/><Fact label="Лиды · 30 дней" fact={director.period?.leads_30??0} plan={director.goals?.leads??0}/><Fact label="Встречи · 30 дней" fact={operations?.meetings_30??0} plan={director.goals?.meetings??0}/><Fact label="Конверсия, %" fact={conversion} plan={director.goals?.conversion??0}/></div></section></div>;
  if(section==="control-models")return <DirectorTable title="Аналитика моделей" text="Путь покупателя от просмотра до подтверждённой продажи." heads={["Модель","Просмотры","Заявки","Встречи","Продажи","Выручка","Прибыль"]} rows={models.map(item=>[data.catalog.find(product=>product.slug===item.tractor_slug)?.model??item.tractor_slug,item.views,item.leads,item.meetings,item.sales,money(item.revenue_minor),money(item.profit_minor)])}/>;
  if(section==="control-attribution")return <DirectorTable title="Сквозная аналитика" text="Канал обращения связан с лидом и выигранной сделкой." heads={["Канал","Лиды","Продажи","Выручка","Прибыль"]} rows={channels.map(item=>[item.source,item.leads,item.sales,money(item.revenue_minor),money(item.profit_minor)])}/>;
  if(section==="control-managers")return <DirectorTable title="Аналитика менеджеров" text="Только сделки и задачи, назначенные конкретному сотруднику." heads={["Сотрудник","Сделки","Продажи","Выручка","Открытые задачи"]} rows={managers.map(item=>[item.display_name,item.deals,item.sales,money(item.revenue_minor),item.open_tasks])}/>;
  if(section==="control-stock")return <div className="admin-content"><section className="admin-panel director-page"><PageHeading title="Риски склада" text="Физический склад учитывается по VIN, а не по публичным карточкам каталога."/><div className="director-facts"><Fact label="Единиц на складе" fact={operations?.stock_units??0}/><Fact label="Активных поставок" fact={operations?.active_shipments??0}/><Fact label="Капитал в остатках" fact={operations?.stock_value_som??0} money/><Fact label="Задолженности" fact={operations?.debts_som??0} money/></div>{(operations?.stock_units??0)===0?<DataNotice text="Чтобы рассчитать дефицит и залежавшуюся технику, добавьте единицы в разделе «Склад техники» с VIN, статусом и стоимостью." href="/admin/company/inventory-units"/>:null}</section></div>;
  if(section==="control-demand")return <div className="admin-content"><section className="admin-panel director-page"><PageHeading title="Спрос и регионы" text="Спрос формируется из согласованных просмотров и заполненных карточек клиентов."/>{models.length?<div className="demand-bars">{models.slice(0,8).map(item=><article key={item.tractor_slug}><span>{data.catalog.find(p=>p.slug===item.tractor_slug)?.model??item.tractor_slug}</span><i><b style={{width:`${Math.max(3,item.views/Math.max(...models.map(row=>Number(row.views)),1)*100)}%`}}/></i><strong>{item.views}</strong></article>)}</div>:<DataNotice text="Данных о спросе пока недостаточно. Они появятся после согласованных просмотров карточек."/>}<div className="region-map-empty"><MapPinned/><h3>Карта регионов Кыргызстана</h3><p>Регионы будут окрашиваться только после заполнения поля «Регион» в карточках клиентов.</p></div></section></div>;
  if(section==="control-forecast")return <div className="admin-content"><section className="admin-panel director-page"><PageHeading title="Прогноз продаж и спроса" text="Прогноз не подменяет факты и всегда отмечен отдельно."/><div className="forecast-card"><span>ПРОГНОЗ</span><TrendingUp/><h3>{models.length<2?"Недостаточно данных для надёжного прогноза":"Расчёт на основе текущей воронки"}</h3><p>{models.length<2?"Нужны история сделок и спроса минимум по двум периодам. Система не показывает выдуманные значения.":`В активной воронке ${deals?.active??0} сделок. Для более точного результата заполните ожидаемые даты и суммы.`}</p></div></section></div>;
  if(section==="control-ai")return <AiDirector data={data}/>;
  return <div className="admin-content"><section className="admin-panel director-page"><PageHeading title="Раздел аналитики" text="Откройте нужный аналитический экран в меню."/><button className="admin-primary" type="button" onClick={()=>onNavigate("overview")}>Вернуться к сводке</button></section></div>;
}

function PageHeading({title,text}:{title:string;text:string}){return <header className="director-page-head"><span>Центр управления</span><h2>{title}</h2><p>{text}</p></header>}
function Fact({label,fact,plan,money=false}:{label:string;fact:number;plan?:number;money?:boolean}){const progress=plan?Math.min(100,Math.round(fact/plan*100)):0;const format=(value:number)=>money?new Intl.NumberFormat("ru-RU").format(value)+" сом":new Intl.NumberFormat("ru-RU").format(value);return <article><span>{label}</span><strong>{format(fact)}</strong>{plan!==undefined?<><small>План: {plan?format(plan):"не задан"}</small><i><b style={{width:`${progress}%`}}/></i></>:<small>Факт из SQL</small>}</article>}
function DirectorTable({title,text,heads,rows}:{title:string;text:string;heads:string[];rows:Array<Array<string|number>>}){return <div className="admin-content"><section className="admin-panel director-page"><PageHeading title={title} text={text}/>{rows.length?<div className="director-table-wrap"><table className="director-table"><thead><tr>{heads.map(head=><th key={head}>{head}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index}>{row.map((cell,cellIndex)=><td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>:<div className="admin-empty"><BarChart3/><h3>Данных пока недостаточно</h3><p>Таблица заполнится автоматически из реальных записей системы.</p></div>}</section></div>}
function DataNotice({text,href}:{text:string;href?:string}){return <div className="director-notice"><ShieldCheck/><p>{text}</p>{href?<a href={href}>Открыть связанный объект <ChevronRight/></a>:null}</div>}
function AiDirector({data}:{data:DashboardData}){const [question,setQuestion]=useState(""),[answer,setAnswer]=useState<string[]|null>(null);function ask(event:FormEvent){event.preventDefault();const q=question.toLowerCase();const deals=data.director?.deals,tasks=data.director?.tasks,ops=data.director?.operations,top=data.director?.models?.[0];const topic=q.includes("склад")||q.includes("остат")?"stock":q.includes("модел")||q.includes("спрос")?"demand":q.includes("задач")?"tasks":"sales";setAnswer(topic==="stock"?[`Что произошло: на физическом складе учтено ${ops?.stock_units??0} единиц техники.`,`Вероятная причина: полнота результата зависит от заполнения VIN и статусов каждой единицы.`,`Подтверждающие данные: капитал в остатках — ${new Intl.NumberFormat("ru-RU").format(ops?.stock_value_som??0)} сом, активных поставок — ${ops?.active_shipments??0}.`,`Рекомендация: проверьте незаполненные VIN, статусы и закупочную стоимость в складском модуле.`]:topic==="demand"?[`Что произошло: больше всего согласованных просмотров у ${top?data.catalog.find(p=>p.slug===top.tractor_slug)?.model??top.tractor_slug:"моделей пока не определено"}.`,`Вероятная причина: пользователи чаще открывали соответствующую карточку.`,`Подтверждающие данные: ${top?.views??0} просмотров и ${top?.leads??0} заявок; это интерес, а не автоматически подтверждённая продажа.`,`Рекомендация: сравните переходы в заявки и продажи перед изменением закупочного плана.`]:topic==="tasks"?[`Что произошло: открыто ${tasks?.open??0} задач, из них просрочено ${tasks?.overdue??0}.`,`Вероятная причина: задачи не закрыты до установленного срока.`,`Подтверждающие данные: система считает только сохранённые задачи CRM.`,`Рекомендация: назначьте ответственных и обновите сроки просроченных задач.`]:[`Что произошло: успешно закрыто ${deals?.won??0} сделок, активных — ${deals?.active??0}.`,`Вероятная причина: результат зависит от заполнения этапов и сумм в CRM.`,`Подтверждающие данные: выручка выигранных сделок — ${new Intl.NumberFormat("ru-RU").format(Math.round((deals?.revenue_minor??0)/100))} сом.`,`Рекомендация: проверьте активные сделки без следующей задачи и суммы на поздних этапах.`]);}return <div className="admin-content"><section className="admin-panel director-page"><PageHeading title="AI-директор" text="Задайте свободный вопрос. Ответ строится только по данным системы и не придумывает показатели."/><form className="ai-director-form" onSubmit={ask}><label><span>Вопрос директору</span><textarea value={question} onChange={event=>setQuestion(event.target.value)} rows={4} required placeholder="Например: что сейчас требует внимания в продажах?"/></label><button className="admin-primary" type="submit"><Bot/>Получить разбор</button></form>{answer?<ol className="ai-director-answer">{answer.map(item=><li key={item}>{item}</li>)}</ol>:null}</section></div>}

function Profile({ data, save }: { data: DashboardData | null; save: (profile: { displayName: string; phone: string; avatar:string; theme:string }) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const f = new FormData(event.currentTarget); save({ displayName: String(f.get("displayName")), phone: String(f.get("phone")), avatar:String(f.get("avatar")), theme:String(f.get("theme")) }); }
  return <div className="admin-content"><form className="admin-panel profile-form" onSubmit={submit}><div className="profile-heading"><AvatarVisual avatar={data?.profile?.avatar ?? null} size={92} /><div><span className="panel-kicker">Настройки аккаунта</span><h2>Профиль сотрудника</h2><p>Данные хранятся в SQL и доступны на любом устройстве.</p></div></div><div className="profile-fields"><label><span>Имя</span><input name="displayName" defaultValue={data?.profile?.display_name} required /></label><label><span>Рабочий телефон</span><input name="phone" defaultValue={data?.profile?.phone} /></label><label><span>Email для входа</span><input value={data?.profile?.email ?? ""} readOnly /></label><label><span>Ссылка на аватар</span><input name="avatar" type="url" defaultValue={data?.profile?.avatar ?? ""} placeholder="https://…"/></label><label><span>Фон кабинета</span><select name="theme" defaultValue={data?.profile?.theme ?? "field"}><option value="field">Поле</option><option value="light">Светлый</option><option value="dark">Тёмный</option></select></label></div><button type="submit" className="admin-primary">Сохранить профиль</button></form></div>;
}

function emptyProduct(): TractorType { return { id: crypto.randomUUID(), slug: "", model: "", hp: 50, category: "Универсальные", farmArea: "до 30 га", price: null, discountPercent: null, promotionLabel: null, inStock: true, status:"draft", sortOrder:0, image: "/images/tractors-4k/cfb504-x.webp", images: ["/images/tractors-4k/cfb504-x.webp"], videoUrl: null, description: "", comfort: "", equipment: [], specs: {} }; }

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
      status: String(f.get("status")) as TractorType["status"],
      sortOrder: Math.max(0, Number(f.get("sortOrder")) || 0),
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
      <fieldset><legend>Цена и витрина</legend><div className="editor-fields"><label><span>Цена, сом</span><input name="price" type="number" min="0" defaultValue={product.price ?? ""} placeholder="Цена по запросу" /></label><label><span>Скидка, %</span><input name="discountPercent" type="number" min="0" max="90" defaultValue={product.discountPercent ?? ""} placeholder="Например, 10" /></label><label><span>Статус публикации</span><select name="status" defaultValue={product.status??"published"}><option value="draft">Черновик</option><option value="published">Опубликовано</option><option value="hidden">Скрыто</option><option value="archived">Архив</option></select></label><label><span>Порядок</span><input name="sortOrder" type="number" min="0" defaultValue={product.sortOrder??0}/></label><label className="full"><span>Название акции</span><input name="promotionLabel" defaultValue={product.promotionLabel ?? ""} placeholder="Например: Сезонная выгода" /></label><label className="editor-check"><input type="checkbox" name="popular" defaultChecked={product.popular}/><span>Популярная модель</span></label><label className="editor-check"><input type="checkbox" name="recommended" defaultChecked={product.recommended}/><span>Рекомендуем</span></label></div></fieldset>
      <fieldset><legend>Описание и комплектация</legend><div className="editor-fields"><label className="full"><span>Описание товара</span><textarea name="description" rows={6} defaultValue={product.description} placeholder="Что умеет трактор и для каких работ подходит" required /><small>Коротко и конкретно: назначение, сильные стороны и выгода для хозяйства.</small></label><label className="full"><span>Комфорт оператора</span><textarea name="comfort" rows={4} defaultValue={product.comfort} placeholder="Кабина, посадка, обзор, органы управления" /></label><label className="full"><span>Комплектация — одна позиция на строку</span><textarea name="equipment" rows={7} defaultValue={equipment} placeholder="Кабина с отопителем&#10;Передние противовесы&#10;Гидравлические выходы" /><small>Эти пункты появятся на странице трактора отдельным понятным списком.</small></label></div></fieldset>
      <fieldset><legend>Фото и видео</legend><div className="editor-fields"><label className="full"><span>Основное изображение</span><input name="image" defaultValue={product.image} required /><small>Путь /images/... или публичная ссылка из хранилища.</small></label><label className="full"><span>Галерея — одно фото на строку</span><textarea name="images" rows={7} defaultValue={gallery} /><small>Первым будет основное изображение. Добавьте фото с разных сторон, кабины и двигателя.</small></label><label className="full"><span>Видео товара</span><input name="videoUrl" type="url" defaultValue={product.videoUrl ?? ""} placeholder="https://.../video.mp4" /><small>Видео сохранится в карточке и будет готово для будущего показа.</small></label></div></fieldset>
      <fieldset><legend>Технические характеристики</legend><div className="editor-fields"><label className="full"><span>Название: значение — одна характеристика на строку</span><textarea name="specs" rows={10} defaultValue={specs} placeholder="Модель двигателя: CF...&#10;Колёсная база: 2200 мм" /></label></div></fieldset>
    </div>
    <footer><button type="button" onClick={close}>Отмена</button><button className="admin-primary" type="submit"><Check size={17} aria-hidden="true" />Сохранить товар</button></footer>
  </form></div>;
}
