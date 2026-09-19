"use client";

import Image from "next/image";
import { Link } from "./SiteLink";
import { BarChart3, Bell, Bot, Calculator, Check, ChevronDown, ChevronRight, CircleUserRound, CreditCard, Eye, EyeOff, FolderKanban, Gauge, Landmark, LayoutDashboard, ListChecks, LoaderCircle, LogOut, MapPinned, Menu, MessageCircleMore, MessageSquareText, Newspaper, PackageSearch, Pencil, Percent, Plus, Search, Settings, ShieldCheck, Sparkles, Tractor, Trash2, TrendingUp, UserRoundCog, UsersRound, Warehouse, Wrench, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Lead, NewsPost, Tractor as TractorType } from "../types";
import { AdminNewsManager } from "./AdminNewsManager";
import { AdminCRM, type CrmMode } from "./AdminCRM";
import { AdminSiteSettings } from "./AdminSiteSettings";
import type { AdminWorkspace } from "./AdminPortalHome";
import { AdminWorkspaceOverview } from "./AdminWorkspaceOverview";
import { AdminMediaUpload } from "./AdminMediaUpload";
import { AdminRecordsManager, type RecordKind } from "./AdminRecordsManager";
import { AdminCollaboration, type CollaborationMode } from "./AdminCollaboration";
import { AtadanLoader } from "./AtadanLoader";

type DashboardData = {
  actor: { id:string; email:string; display_name:string; role:"owner"|"director"|"manager"|"accountant"|"marketer"; theme:string; phone:string; avatar:string|null;position:string;department:string;skills:string;bio:string;permissions:string[] };
  catalog: TractorType[];
  leads: Array<Lead & Record<string, string>>;
  popular: Array<{ tractor_slug: string; views: number }>;
  totals: { views: number; visitors: number } | null;
  daily: Array<{ day: string; views: number }>;
  profile: { display_name: string; phone: string; email: string; avatar:string|null; theme:string;position:string;department:string;skills:string;bio:string;role:string } | null;
  posts: NewsPost[];
  popularPosts: Array<{ path: string; views: number }>;
  director?: {
    deals?: { total:number; active:number; won:number; revenue_minor:number; profit_minor:number;paid_minor:number } | null;
    tasks?: { total:number; open:number; overdue:number } | null;
    pipeline?: Array<{ stage:string; count:number; amount_minor:number }>;
    period?: { views_30:number; visitors_30:number; leads_30:number } | null;
    goals?: { sales:number; revenueMinor:number; profitMinor:number; leads:number; meetings:number; conversion:number };
    operations?: { stock_units:number;active_shipments:number;meetings_30:number;income_som:number;expenses_som:number;debts_som:number;stock_value_som:number;cash_balance_som:number;deals_without_next_step:number;delayed_shipments:number } | null;
    models?: Array<{tractor_slug:string;views:number;leads:number;qualified:number;meetings:number;proposals:number;sales:number;revenue_minor:number;profit_minor:number}>;
    channels?: Array<{source:string;leads:number;sales:number;revenue_minor:number;profit_minor:number}>;
    managers?: Array<{id:string;display_name:string;deals:number;sales:number;revenue_minor:number;open_tasks:number}>;
    comparison?: {leads_current:number;leads_previous:number;sales_current:number;sales_previous:number;revenue_current_minor:number;revenue_previous_minor:number;profit_current_minor:number;profit_previous_minor:number;expenses_current_som:number;expenses_previous_som:number}|null;
    forecast?:{active_deals:number;weighted_minor:number;closed_sample:number;won_sample:number;insufficientData:boolean}|null;
    regions?:Array<{region:string;customers:number;leads:number;sales:number;average_budget_minor:number;revenue_minor:number;models:string|null}>;
  };
};

type ActorRole=DashboardData["actor"]["role"];
type SectionDef={id:string;label:string;icon:typeof LayoutDashboard;kind?:RecordKind;ownerOnly?:boolean;navHidden?:boolean;roles?:ActorRole[]};
const workspaceSections:Record<AdminWorkspace,SectionDef[]>={
  marketing:[
    {id:"overview",label:"Маркетинг",icon:LayoutDashboard,navHidden:true},
    {id:"catalog",label:"Каталог товаров",icon:Tractor},
    {id:"parts",label:"Запчасти",icon:PackageSearch,kind:"parts"},
    {id:"news",label:"Новости · Публикации",icon:Newspaper},
    {id:"public-service",label:"Сервис",icon:Wrench,kind:"service_pages"},
    {id:"faq",label:"Чатбот · FAQ",icon:Bot,kind:"faq"},
    {id:"leasing",label:"Лизинг и рассрочка",icon:Landmark,kind:"leasing_terms"},
    {id:"leasing-models",label:"Условия по моделям",icon:Tractor,kind:"leasing_model_terms"},
    {id:"promotions",label:"Акции",icon:Percent,kind:"promotions"},
    {id:"leasing-applications",label:"Заявки на лизинг",icon:CreditCard,kind:"leasing_applications"},
    {id:"site-leads",label:"Заявки с сайта",icon:MessageSquareText},
    {id:"site-analytics",label:"Аналитика сайта",icon:BarChart3},
    {id:"site-settings",label:"Настройки сайта",icon:Settings},
  ],
  company:[
    {id:"overview",label:"Управление компанией",icon:LayoutDashboard,navHidden:true},
    {id:"deals",label:"Воронка продаж",icon:Gauge,roles:["owner","director","manager"]},
    {id:"client-base",label:"Клиенты",icon:UsersRound,roles:["owner","director","manager"]},
    {id:"inventory-units",label:"Склад",icon:Warehouse,roles:["owner","director","manager"]},
    {id:"sales",label:"Продажи",icon:TrendingUp,kind:"sales",roles:["owner","director","manager"]},
    {id:"suppliers",label:"Поставщики",icon:PackageSearch,kind:"suppliers",roles:["owner","director","manager","accountant"]},
    {id:"purchases",label:"Закупки",icon:ListChecks,kind:"purchases",roles:["owner","director","accountant"]},
    {id:"shipments",label:"Поставки",icon:Warehouse,kind:"shipments",roles:["owner","director","accountant"]},
    {id:"expenses",label:"Расходы",icon:Calculator,kind:"finance_entries",roles:["owner","director","accountant"]},
    {id:"finance",label:"Финансы",icon:CreditCard,roles:["owner","director","accountant"]},
    {id:"financial-accounts",label:"Счета и кассы",icon:CreditCard,kind:"financial_accounts",roles:["owner","director","accountant"]},
    {id:"payroll",label:"Зарплаты",icon:CircleUserRound,kind:"payroll",roles:["owner","director","accountant"]},
    {id:"payments",label:"Платежи",icon:CreditCard,kind:"payments",roles:["owner","director","accountant","manager"]},
    {id:"debts",label:"Задолженности",icon:Landmark,kind:"debts",roles:["owner","director","accountant"]},
    {id:"documents",label:"Документы",icon:ListChecks,kind:"documents",roles:["owner","director","manager","accountant"]},
    {id:"meetings",label:"Встречи",icon:UsersRound,kind:"meetings",roles:["owner","director","manager"]},
    {id:"service-cases",label:"Сервис клиентов",icon:Wrench,kind:"service_cases",roles:["owner","director","manager"]},
    {id:"employee-tasks",label:"Задачи",icon:ListChecks},
    {id:"notifications",label:"Уведомления",icon:Bell},
    {id:"chat",label:"Чат",icon:MessageCircleMore},
    {id:"groups",label:"Группы",icon:FolderKanban},
    {id:"team",label:"Сотрудники",icon:UserRoundCog,roles:["owner","director"]},
    {id:"audit",label:"Журнал действий",icon:ShieldCheck,roles:["owner","director"]},
  ],
  control:[
    {id:"overview",label:"Рабочий стол",icon:LayoutDashboard},{id:"control-plan",label:"План / факт",icon:Gauge,roles:["owner","director"]},{id:"control-models",label:"Аналитика моделей",icon:Tractor,roles:["owner","director"]},{id:"control-demand",label:"Спрос и регионы",icon:MapPinned,roles:["owner","director"]},{id:"control-stock",label:"Риски склада",icon:Warehouse,roles:["owner","director"]},{id:"control-managers",label:"Менеджеры",icon:UsersRound,roles:["owner","director"]},{id:"control-attribution",label:"Сквозная аналитика",icon:BarChart3,roles:["owner","director"]},{id:"control-forecast",label:"Прогноз",icon:TrendingUp,roles:["owner","director"]},{id:"control-ai",label:"Аналитический помощник",icon:Bot,roles:["owner","director"]},{id:"profile",label:"Мой профиль",icon:Settings},
  ],
};
type SectionId=string;
const workspaceNames:Record<AdminWorkspace,string>={marketing:"Маркетинг",company:"CRM и компания",control:"Рабочий стол"};
type NavItem={workspace:AdminWorkspace;section:string};
type NavGroup={id:string;label:string;items:NavItem[]};
const navGroups:NavGroup[]=[
  {id:"marketing",label:"Маркетинг",items:[
    {workspace:"marketing",section:"catalog"},{workspace:"marketing",section:"parts"},{workspace:"marketing",section:"news"},{workspace:"marketing",section:"public-service"},{workspace:"marketing",section:"leasing"},{workspace:"marketing",section:"leasing-models"},{workspace:"marketing",section:"promotions"},{workspace:"marketing",section:"leasing-applications"},{workspace:"marketing",section:"faq"},{workspace:"marketing",section:"site-leads"},{workspace:"marketing",section:"site-analytics"},
  ]},
  {id:"crm",label:"CRM и компания",items:[
    {workspace:"company",section:"deals"},{workspace:"company",section:"client-base"},{workspace:"company",section:"inventory-units"},{workspace:"company",section:"sales"},{workspace:"company",section:"suppliers"},{workspace:"company",section:"purchases"},{workspace:"company",section:"shipments"},{workspace:"company",section:"documents"},{workspace:"company",section:"meetings"},{workspace:"company",section:"service-cases"},{workspace:"company",section:"expenses"},{workspace:"company",section:"finance"},{workspace:"company",section:"financial-accounts"},{workspace:"company",section:"payroll"},{workspace:"company",section:"payments"},{workspace:"company",section:"debts"},{workspace:"company",section:"employee-tasks"},
  ]},
  {id:"team",label:"Совместная работа",items:[
    {workspace:"company",section:"notifications"},{workspace:"company",section:"chat"},{workspace:"company",section:"groups"},{workspace:"company",section:"team"},
  ]},
  {id:"system",label:"Настройки и контроль",items:[
    {workspace:"control",section:"profile"},{workspace:"marketing",section:"site-settings"},{workspace:"company",section:"audit"},{workspace:"control",section:"control-plan"},{workspace:"control",section:"control-models"},{workspace:"control",section:"control-demand"},{workspace:"control",section:"control-stock"},{workspace:"control",section:"control-managers"},{workspace:"control",section:"control-attribution"},{workspace:"control",section:"control-forecast"},{workspace:"control",section:"control-ai"},
  ]},
];

export function AdminDashboard({initialWorkspace=null,initialSection="overview"}:{initialWorkspace?:AdminWorkspace|null;initialSection?:string}={}) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [section, setSection] = useState<SectionId>(initialSection);
  const [workspace, setWorkspace] = useState<AdminWorkspace>(initialWorkspace ?? "control");
  const [sidebar, setSidebar] = useState(false);
  const [openGroups,setOpenGroups]=useState<Record<string,boolean>>({marketing:true,crm:true,team:false,system:false});
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
      const nextWorkspace=(["marketing","company","control"] as const).find(value=>value===parts[1])??"control";
      setWorkspace(nextWorkspace);
      setSection(parts[2]||"overview");
    };
    window.addEventListener("popstate",handlePopState);
    return()=>window.removeEventListener("popstate",handlePopState);
  },[]);

  function openSection(id:string){setSection(id);setSidebar(false);window.history.pushState({},"",`/admin/${workspace}/${id}`)}
  function navigateTo(target:NavItem){setWorkspace(target.workspace);setSection(target.section);setSidebar(false);window.history.pushState({},"",`/admin/${target.workspace}/${target.section}`)}
  function toggleGroup(id:string){setOpenGroups(current=>({...current,[id]:!current[id]}))}

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "");
    const password = String(form.get("password") ?? "");
    const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    if (response.ok) { setToast(""); setAuthenticated(null); await load(); setLoading(false); return; }
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
    setWorkspace("control");
    setSection("overview");
  }

  if (authenticated === null) return <AtadanLoader label="Загружаем кабинет…" detail="Проверяем доступ и готовим рабочий стол" className="atadan-loader-admin" />;
  if (!authenticated) return (
    <main className="admin-login-page">
      <div className="admin-login-glow glow-one" aria-hidden="true"/><div className="admin-login-glow glow-two" aria-hidden="true"/>
      <section className="admin-login-brand" aria-label="ATADAN CRM">
        <Image src="/atadan-logo-cropped.png" alt="ATADAN Changfa" width={360} height={125} priority />
        <div className="admin-login-story"><span><Sparkles/> ATADAN CRM</span><h2>Вся работа с техникой в одном пространстве</h2><p>Каталог, клиенты, сделки, заявки и аналитика доступны вашей команде в защищённом кабинете.</p></div>
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

  if (!data) return dashboardError ? <div className="admin-loader"><ShieldCheck/><span>{dashboardError}</span><button type="button" onClick={()=>void load()}>Повторить</button></div> : <AtadanLoader label="Загружаем данные…" detail="Собираем актуальные показатели ATADAN" className="atadan-loader-admin" />;
  const newLeads = data?.leads.filter((lead) => lead.status === "new").length ?? 0;
  const director=data.actor.role==="owner"||data.actor.role==="director";
  const canSee=(id:string)=>director||id==="overview"||id==="profile"||data.actor.permissions.includes(id);
  const roleAllows=(item:SectionDef)=>!item.roles||item.roles.includes(data.actor.role)||data.actor.permissions.includes(item.id);
  const visibleSections=workspaceSections[workspace].filter(item=>(!item.ownerOnly||director)&&roleAllows(item)&&canSee(item.id));
  const activeDefinition=visibleSections.find(item=>item.id===section)??visibleSections[0];
  const renderedSection=activeDefinition?.id??"overview";
  const activeGroup=navGroups.find(group=>group.items.some(item=>item.workspace===workspace&&item.section===renderedSection));
  const definitionFor=(target:NavItem)=>workspaceSections[target.workspace].find(item=>item.id===target.section);
  const crmMode:CrmMode|null=renderedSection==="client-base"?"customers":renderedSection==="employee-tasks"?"tasks":(["deals","team","costs","audit"] as CrmMode[]).includes(renderedSection as CrmMode)?renderedSection as CrmMode:null;
  return (
    <main className="admin-shell admin-shell-unified" data-admin-theme={data.profile?.theme ?? "field"} data-workspace={workspace}>
      <aside className={`admin-sidebar ${sidebar ? "is-open" : ""}`}>
        <div className="admin-logo"><span><Image src="/atadan-logo-cropped.png" alt="ATADAN Changfa" width={240} height={83} /><small>рабочее пространство</small></span><button type="button" onClick={() => setSidebar(false)} aria-label="Закрыть меню"><X /></button></div>
        <nav className="admin-unified-nav" aria-label="Основная навигация">
          <button type="button" className={workspace==="control"&&renderedSection==="overview"?"active":""} onClick={()=>navigateTo({workspace:"control",section:"overview"})}><LayoutDashboard size={19}/>Рабочий стол</button>
          {navGroups.map(group=>{
            const items=group.items.map(target=>({target,definition:definitionFor(target)})).filter((item):item is {target:NavItem;definition:SectionDef}=>Boolean(item.definition&&roleAllows(item.definition)&&(!item.definition.ownerOnly||director)&&canSee(item.definition.id)));
            if(!items.length)return null;
            const expanded=Boolean(openGroups[group.id]);
            return <section className="admin-nav-folder" key={group.id}><button className="admin-nav-folder-toggle" type="button" aria-expanded={expanded} onClick={()=>toggleGroup(group.id)}><span>{group.label}</span><ChevronDown aria-hidden="true"/></button>{expanded?<div>{items.map(({target,definition})=>{const Icon=definition.icon;const active=workspace===target.workspace&&renderedSection===target.section;return <button type="button" className={active?"active":""} onClick={()=>navigateTo(target)} key={`${target.workspace}-${target.section}`}><Icon size={18}/>{definition.label}</button>})}</div>:null}</section>
          })}
        </nav>
        <div className="admin-sidebar-footer"><AvatarVisual avatar={data?.profile?.avatar ?? null} size={38} /><div><strong>{data?.profile?.display_name ?? "Администратор"}</strong><span>{data?.profile?.email}</span></div><button type="button" onClick={logout} aria-label="Выйти"><LogOut size={18} /></button></div>
      </aside>
      <section className="admin-main">
        <header className="admin-header"><button className="admin-menu" type="button" onClick={() => setSidebar(true)} aria-label="Открыть меню"><Menu /></button><div><span>ATADAN / {activeGroup?.label??workspaceNames[workspace]}</span><h1>{activeDefinition?.label}</h1></div><div className="admin-header-tools"><button type="button" onClick={()=>navigateTo({workspace:"company",section:"notifications"})} aria-label="Открыть уведомления"><Bell size={18} />{newLeads ? <b>{newLeads}</b> : null}</button><Link href="/" target="_blank">Открыть сайт <ChevronRight size={17} /></Link></div></header>
        {renderedSection === "overview" ? <AdminWorkspaceOverview workspace={workspace} data={data} onNavigate={openSection} onSaveGoals={async goals=>action({action:"save_goals",goals})}/> : null}
        {crmMode ? <AdminCRM mode={crmMode} catalog={data?.catalog ?? []} /> : null}
        {renderedSection === "catalog" ? <Products data={data} edit={setProductEditor} remove={(slug) => action({ action: "delete_product", slug })} /> : null}
        {renderedSection === "news" ? <AdminNewsManager posts={data?.posts ?? []} catalog={data?.catalog ?? []} popularPosts={data?.popularPosts ?? []} save={async (post, originalSlug) => action({ action: "save_news", post, originalSlug })} remove={async (slug) => { await action({ action: "delete_news", slug }); }} /> : null}
        {renderedSection === "site-leads" ? <Leads data={data} update={(id, status) => action({ action: "lead_status", id, status })} /> : null}
        {renderedSection === "site-analytics" ? <Analytics data={data} /> : null}
        {renderedSection === "profile" ? <Profile data={data} save={(profile) => action({ action: "save_profile", profile })} /> : null}
        {renderedSection === "site-settings" ? <AdminSiteSettings /> : null}
        {renderedSection === "inventory-units" ? <InventoryCatalog data={data}/> : null}
        {renderedSection === "finance" ? <FinanceCenter data={data} navigate={navigateTo}/> : null}
        {(["notifications","chat","groups"] as CollaborationMode[]).includes(renderedSection as CollaborationMode) ? <AdminCollaboration mode={renderedSection as CollaborationMode}/> : null}
        {activeDefinition?.kind ? <AdminRecordsManager key={activeDefinition.kind} kind={activeDefinition.kind}/> : null}
        {workspace==="control"&&renderedSection.startsWith("control-")?<DirectorDetail section={renderedSection} data={data} onNavigate={openSection}/>:null}
      </section>
      {renderedSection === "catalog" ? <button type="button" className="admin-fab" onClick={() => setProductEditor(emptyProduct())}><Plus /> Добавить трактор</button> : null}
      {productEditor ? <ProductEditor product={productEditor} close={() => setProductEditor(null)} save={async (product) => { const saved=await action({ action: "save_product", product });if(saved)setProductEditor(null);return saved; }} /> : null}
      {toast ? <div className="admin-toast"><Check size={16} />{toast}<button type="button" onClick={() => setToast("")}><X size={14} /></button></div> : null}
    </main>
  );
}

function AvatarVisual({ avatar, size }: { avatar: string | null; size: number }) {
  return avatar ? <span className="admin-avatar-image" style={{ width: size, height: size }}><Image src={avatar} alt="Фото администратора" width={size} height={size} unoptimized /></span> : <span className="admin-avatar" style={{ width: size, height: size }}>A</span>;
}

function Metric({ label, value, icon: Icon, note }: { label: string; value: string | number; icon: typeof Gauge; note: string }) { return <article className="metric-card"><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div><i><Icon size={21} /></i></article>; }

function InventoryCatalog({data}:{data:DashboardData}){
  const [query,setQuery]=useState("");
  const products=data.catalog.filter(item=>`${item.model} ${item.category} ${item.hp}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="inventory-center"><section className="admin-content"><div className="admin-panel inventory-catalog-panel"><div className="records-intro inventory-heading"><div><span>Единый каталог</span><h2>Все товары уже связаны со складом</h2><p>Карточка товара используется на публичном сайте и в складском учёте. Для физической единицы добавьте VIN и статус ниже.</p></div><label><Search aria-hidden="true"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Модель, мощность или категория" aria-label="Поиск по складскому каталогу"/></label></div><div className="inventory-catalog-grid">{products.map(product=><article key={product.slug}><span><Image src={product.image} alt={`Changfa ${product.model}`} width={150} height={105}/></span><div><small>{product.category}</small><h3>Changfa {product.model}</h3><p>{product.hp} л.с. · {product.inStock?"доступен к продаже":"под заказ"}</p></div><strong>{product.price?`${new Intl.NumberFormat("ru-RU").format(product.price)} сом`:"Цена по запросу"}</strong></article>)}</div>{!products.length?<div className="admin-empty"><Search/><h3>Товары не найдены</h3><p>Измените поисковый запрос.</p></div>:null}</div></section><AdminRecordsManager kind="inventory_units"/></div>;
}

function FinanceCenter({data,navigate}:{data:DashboardData;navigate:(target:NavItem)=>void}){
  const deals=data.director?.deals,operations=data.director?.operations;
  const revenue=Math.round((deals?.revenue_minor??0)/100),payments=Math.round((deals?.paid_minor??0)/100),expenses=Math.round(operations?.expenses_som??0),grossProfit=Math.round((deals?.profit_minor??0)/100),balance=Math.round(operations?.cash_balance_som??0),debts=Math.round(operations?.debts_som??0);
  const money=(value:number)=>new Intl.NumberFormat("ru-RU").format(value)+" сом";
  const links:[string,string,typeof Calculator][]=[["expenses","Расходы",Calculator],["payroll","Зарплаты",CircleUserRound],["payments","Платежи",CreditCard],["debts","Задолженности",Landmark]];
  return <div className="admin-content finance-center"><section className="admin-panel finance-summary"><header><div><span>Управленческий учёт</span><h2>Финансы компании</h2><p>Продажи, фактические деньги, долги и расходы считаются отдельно.</p></div><b>За всё время</b></header><div className="finance-summary-grid"><Metric label="Выручка" value={money(revenue)} icon={TrendingUp} note="оформленные продажи"/><Metric label="Фактически оплачено" value={money(payments)} icon={CreditCard} note="проведённые платежи"/><Metric label="Задолженность" value={money(debts)} icon={Landmark} note="договоры минус оплаты"/><Metric label="Расходы" value={money(expenses)} icon={Calculator} note="исходящие движения"/><Metric label="Валовая прибыль" value={money(grossProfit)} icon={BarChart3} note="продажа минус полная себестоимость"/><Metric label="Денежный остаток" value={money(balance)} icon={CreditCard} note="только движения по счетам"/></div><div className="finance-exports"><span>Экспорт:</span>{["clients","deals","sales","inventory","payments","debts","expenses"].map(type=><a key={type} href={`/api/admin/data?type=${type}`} download>{type}</a>)}</div></section><section className="admin-panel finance-journal-links"><div className="panel-head"><div><span>Финансовый журнал</span><h2>Операции и обязательства</h2></div></div>{links.map(([section,label,Icon])=><button type="button" key={section} onClick={()=>navigate({workspace:"company",section})}><Icon aria-hidden="true"/><span><strong>{label}</strong><small>Открыть записи, фильтры и добавление</small></span><ChevronRight aria-hidden="true"/></button>)}</section><DataExchange/></div>;
}

function DataExchange(){
  type ImportResult={filename?:string;total?:number;valid?:number;errors?:Array<{row:number;error:string}>;preview?:Array<Record<string,unknown>>;canCommit?:boolean;message?:string};
  const [kind,setKind]=useState("customers"),[file,setFile]=useState<File|null>(null),[result,setResult]=useState<ImportResult>({}),[busy,setBusy]=useState(false);
  async function run(action:"validate_import"|"commit_import"){
    if(!file)return;
    setBusy(true);
    const payload=new FormData();payload.set("action",action);payload.set("kind",kind);payload.set("file",file);
    const response=await fetch("/api/admin/data",{method:"POST",body:payload});
    const body=await response.json().catch(()=>({})) as ImportResult&{imported?:number;error?:string};
    setBusy(false);
    setResult(response.ok?{...body,message:body.imported?`Импортировано: ${body.imported}`:undefined}:{message:body.error||"Ошибка импорта"});
  }
  async function backup(){
    setBusy(true);
    const response=await fetch("/api/admin/data",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"backup_check"})});
    const body=await response.json().catch(()=>({})) as {status?:string;error?:string};
    setBusy(false);
    setResult({message:response.ok?"Целостность критичных таблиц проверена. Резервные копии и срок хранения нужно отдельно подтвердить в Neon.":body.error});
  }
  const previewColumns=result.preview?.length?Object.keys(result.preview[0]).filter(key=>!key.endsWith("Minor")&&key!=="normalizedPhone"):[];
  return <section className="admin-panel data-exchange">
    <div className="panel-head"><div><span>Перенос и сохранность данных</span><h2>Импорт CSV/XLSX и контроль сохранности</h2><p>Файл сначала проходит серверную проверку обязательных колонок, строк и дублей. Запись доступна только после чистого предпросмотра.</p></div></div>
    <label><span>Тип данных</span><select value={kind} onChange={event=>{setKind(event.target.value);setResult({})}}><option value="customers">Клиенты</option><option value="inventory">Склад по VIN</option></select></label>
    <label><span>Файл до 5 МБ</span><input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event=>{setFile(event.target.files?.[0]??null);setResult({})}}/><small>{kind==="customers"?"Обязательные колонки: name, phone":"Обязательные колонки: vin, model, tractorSlug"}. Допускаются русские названия колонок.</small></label>
    <div><button type="button" disabled={busy||!file} onClick={()=>void run("validate_import")}>{busy?<LoaderCircle className="spin"/>:null}Проверить файл</button><button type="button" disabled={busy||!result.canCommit} onClick={()=>void run("commit_import")}>Импортировать после проверки</button><button type="button" disabled={busy} onClick={()=>void backup()}>Проверить целостность базы</button></div>
    {result.total!==undefined?<p><strong>{result.filename||file?.name}</strong>: строк {result.total}, корректных {result.valid}, ошибок {result.errors?.length??0}</p>:null}
    {result.preview?.length?<div className="import-preview"><strong>Предпросмотр первых {result.preview.length} строк</strong><div><table><thead><tr>{previewColumns.map(column=><th key={column}>{column}</th>)}</tr></thead><tbody>{result.preview.map((row,index)=><tr key={String(row.row??index)}>{previewColumns.map(column=><td key={column}>{String(row[column]??"")}</td>)}</tr>)}</tbody></table></div></div>:null}
    {result.errors?.slice(0,20).map(item=><p className="form-error" key={`${item.row}-${item.error}`}>Строка {item.row}: {item.error}</p>)}
    {result.message?<p role="status">{result.message}</p>:null}
  </section>
}

function Products({ data, edit, remove }: { data: DashboardData | null; edit: (product: TractorType) => void; remove: (slug: string) => void }) {
  const [query, setQuery] = useState("");
  const [status,setStatus]=useState("all"),[sort,setSort]=useState("power-desc"),[page,setPage]=useState(1),[pendingDelete,setPendingDelete]=useState<TractorType|null>(null);const pageSize=12;
  const products = useMemo(() => {const result=data?.catalog.filter((p) => p.model.toLowerCase().includes(query.toLowerCase())&&(status==="all"||(p.status??"published")===status)) ?? [];return result.toSorted((a,b)=>sort==="power-desc"?b.hp-a.hp:sort==="power-asc"?a.hp-b.hp:a.model.localeCompare(b.model));}, [data, query,status,sort]);
  const shown=products.slice((page-1)*pageSize,page*pageSize),pages=Math.max(1,Math.ceil(products.length/pageSize));
  return <div className="admin-content"><div className="admin-panel admin-products-panel"><div className="admin-table-tools"><label><Search size={18} aria-hidden="true" /><input value={query} onChange={(e) => {setQuery(e.target.value);setPage(1)}} placeholder="Найти модель" aria-label="Найти модель" /></label><select value={status} onChange={event=>{setStatus(event.target.value);setPage(1)}} aria-label="Статус каталога"><option value="all">Все статусы</option><option value="published">Опубликовано</option><option value="draft">Черновик</option><option value="hidden">Скрыто</option><option value="archived">Архив</option></select><select value={sort} onChange={event=>{setSort(event.target.value);setPage(1)}} aria-label="Сортировка каталога"><option value="power-desc">Мощные сначала</option><option value="power-asc">Маломощные сначала</option><option value="name">По названию</option></select><span>{products.length} моделей</span></div><div className="admin-product-grid">{shown.map((product) => <article className="admin-product-card" key={product.slug}>
    <div className="admin-product-media">
      {product.discountPercent ? <span className="admin-promo-tag"><Percent size={13} aria-hidden="true" />−{product.discountPercent}%</span> : null}
      <span className={`admin-product-stock ${product.inStock ? "available" : "order"}`}>{product.inStock ? "В наличии" : "Под заказ"}</span>
      <div className="admin-product-image"><Image src={product.image} alt={`Changfa ${product.model}`} width={360} height={248} /></div>
    </div>
    <div className="admin-product-summary"><span>{product.category} · {product.hp} л.с. · {product.status==="draft"?"Черновик":product.status==="hidden"?"Скрыто":product.status==="archived"?"Архив":"Опубликовано"}</span><h3>Changfa {product.model}</h3><p>{product.description || "Добавьте короткое описание, чтобы карточка была полезнее покупателю."}</p><div className="admin-product-facts"><span><ListChecks size={15} aria-hidden="true" />{product.equipment?.length ? `${product.equipment.length} позиций комплектации` : "Комплектация не заполнена"}</span><span>{product.price ? `${new Intl.NumberFormat("ru-RU").format(product.price)} сом` : "Цена по запросу"}</span></div></div>
    <div className="admin-card-actions"><button type="button" onClick={() => edit(product)}><Pencil size={16} aria-hidden="true" />Изменить</button><button className="admin-delete-button" type="button" onClick={() => setPendingDelete(product)} aria-label={`Архивировать ${product.model}`}><Trash2 size={16} aria-hidden="true" /><span>В архив</span></button></div>
  </article>)}</div><footer className="records-pagination"><span>Страница {page} из {pages}</span><div><button type="button" aria-label="Предыдущая страница" disabled={page<=1} onClick={()=>setPage(value=>value-1)}><ChevronRight style={{transform:"rotate(180deg)"}}/></button><button type="button" aria-label="Следующая страница" disabled={page>=pages} onClick={()=>setPage(value=>value+1)}><ChevronRight/></button></div></footer>{pendingDelete?<div className="inline-confirm" role="dialog" aria-modal="true" aria-labelledby="archive-tractor-title"><strong id="archive-tractor-title">Архивировать Changfa {pendingDelete.model}?</strong><span>Публичная карточка будет скрыта, данные сохранятся.</span><button type="button" onClick={()=>setPendingDelete(null)}>Отмена</button><button type="button" className="admin-delete-button" onClick={()=>{remove(pendingDelete.slug);setPendingDelete(null)}}>Архивировать</button></div>:null}</div></div>;
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
  if(section==="control-models")return <DirectorTable title="Аналитика моделей" text="Просмотр не равен спросу: показана полная последовательная воронка." heads={["Модель","Просмотры","Лиды","Квалификация","Встречи","КП","Продажи","Выручка","Прибыль"]} rows={models.map(item=>[data.catalog.find(product=>product.slug===item.tractor_slug)?.model??item.tractor_slug,item.views,item.leads,item.qualified,item.meetings,item.proposals,item.sales,money(item.revenue_minor),money(item.profit_minor)])}/>;
  if(section==="control-attribution")return <DirectorTable title="Сквозная аналитика" text="Канал обращения связан с лидом и выигранной сделкой." heads={["Канал","Лиды","Продажи","Выручка","Прибыль"]} rows={channels.map(item=>[item.source,item.leads,item.sales,money(item.revenue_minor),money(item.profit_minor)])}/>;
  if(section==="control-managers")return <DirectorTable title="Аналитика менеджеров" text="Только сделки и задачи, назначенные конкретному сотруднику." heads={["Сотрудник","Сделки","Продажи","Выручка","Открытые задачи"]} rows={managers.map(item=>[item.display_name,item.deals,item.sales,money(item.revenue_minor),item.open_tasks])}/>;
  if(section==="control-stock")return <div className="admin-content"><section className="admin-panel director-page"><PageHeading title="Риски склада" text="Физический склад учитывается по VIN, а не по публичным карточкам каталога."/><div className="director-facts"><Fact label="Единиц на складе" fact={operations?.stock_units??0}/><Fact label="Активных поставок" fact={operations?.active_shipments??0}/><Fact label="Капитал в остатках" fact={operations?.stock_value_som??0} money/><Fact label="Задолженности" fact={operations?.debts_som??0} money/></div>{(operations?.stock_units??0)===0?<DataNotice text="Чтобы рассчитать дефицит и залежавшуюся технику, добавьте единицы в разделе «Склад техники» с VIN, статусом и стоимостью." href="/admin/company/inventory-units"/>:null}</section></div>;
  if(section==="control-demand")return <div className="admin-content"><section className="admin-panel director-page"><PageHeading title="Спрос и регионы" text="Просмотры показаны отдельно от реальных лидов, бюджетов и продаж по регионам Кыргызстана."/>{models.length?<div className="demand-bars">{models.slice(0,8).map(item=><article key={item.tractor_slug}><span>{data.catalog.find(p=>p.slug===item.tractor_slug)?.model??item.tractor_slug}</span><i><b style={{width:`${Math.max(3,item.views/Math.max(...models.map(row=>Number(row.views)),1)*100)}%`}}/></i><strong>{item.views} / {item.leads} лидов</strong></article>)}</div>:<DataNotice text="Данных о спросе пока недостаточно. Они появятся после согласованных просмотров карточек."/>}{director.regions?.length?<div className="director-table-wrap"><table className="director-table"><thead><tr><th>Регион</th><th>Клиенты</th><th>Лиды</th><th>Продажи</th><th>Средний бюджет</th><th>Выручка</th><th>Модели</th></tr></thead><tbody>{director.regions.map(row=><tr key={row.region}><td>{row.region}</td><td>{row.customers}</td><td>{row.leads}</td><td>{row.sales}</td><td>{money(row.average_budget_minor)}</td><td>{money(row.revenue_minor)}</td><td>{row.models||"Недостаточно данных"}</td></tr>)}</tbody></table></div>:<div className="region-map-empty"><MapPinned/><h3>Недостаточно данных по регионам</h3><p>Заполните регион, бюджет и интересующую модель в карточках клиентов.</p></div>}</section></div>;
  if(section==="control-forecast"){const forecast=director.forecast;return <div className="admin-content"><section className="admin-panel director-page"><PageHeading title="Прогноз продаж и спроса" text="Взвешенный прогноз использует активные сделки, суммы, стадии, вероятности и размер исторической выборки."/><div className="forecast-card"><span>ПРОГНОЗ</span><TrendingUp/><h3>{forecast?.insufficientData?"Недостаточно данных для надёжного прогноза":money(forecast?.weighted_minor)}</h3><p>{forecast?.insufficientData?`Нужно не менее 5 завершённых сделок и хотя бы одна активная. Сейчас завершённых: ${forecast?.closed_sample??0}, активных: ${forecast?.active_deals??0}.`:`Взвешенная сумма по ${forecast?.active_deals??0} активным сделкам. Историческая база: ${forecast?.closed_sample??0} завершённых сделок за 180 дней.`}</p></div></section></div>}
  if(section==="control-ai")return <AiDirector data={data}/>;
  return <div className="admin-content"><section className="admin-panel director-page"><PageHeading title="Раздел аналитики" text="Откройте нужный аналитический экран в меню."/><button className="admin-primary" type="button" onClick={()=>onNavigate("overview")}>Вернуться к сводке</button></section></div>;
}

function PageHeading({title,text}:{title:string;text:string}){return <header className="director-page-head"><span>Центр управления</span><h2>{title}</h2><p>{text}</p></header>}
function Fact({label,fact,plan,money=false}:{label:string;fact:number;plan?:number;money?:boolean}){const progress=plan?Math.min(100,Math.round(fact/plan*100)):0;const format=(value:number)=>money?new Intl.NumberFormat("ru-RU").format(value)+" сом":new Intl.NumberFormat("ru-RU").format(value);return <article><span>{label}</span><strong>{format(fact)}</strong>{plan!==undefined?<><small>План: {plan?format(plan):"не задан"}</small><i><b style={{width:`${progress}%`}}/></i></>:<small>Факт из SQL</small>}</article>}
function DirectorTable({title,text,heads,rows}:{title:string;text:string;heads:string[];rows:Array<Array<string|number>>}){return <div className="admin-content"><section className="admin-panel director-page"><PageHeading title={title} text={text}/>{rows.length?<div className="director-table-wrap"><table className="director-table"><thead><tr>{heads.map(head=><th key={head}>{head}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index}>{row.map((cell,cellIndex)=><td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>:<div className="admin-empty"><BarChart3/><h3>Данных пока недостаточно</h3><p>Таблица заполнится автоматически из реальных записей системы.</p></div>}</section></div>}
function DataNotice({text,href}:{text:string;href?:string}){return <div className="director-notice"><ShieldCheck/><p>{text}</p>{href?<a href={href}>Открыть связанный объект <ChevronRight/></a>:null}</div>}
function AiDirector({data}:{data:DashboardData}){const [question,setQuestion]=useState(""),[answer,setAnswer]=useState<string[]|null>(null);function ask(event:FormEvent){event.preventDefault();const q=question.toLowerCase();const deals=data.director?.deals,tasks=data.director?.tasks,ops=data.director?.operations,top=data.director?.models?.[0];const topic=q.includes("склад")||q.includes("остат")?"stock":q.includes("модел")||q.includes("спрос")?"demand":q.includes("задач")?"tasks":"sales";setAnswer(topic==="stock"?[`Что произошло: на физическом складе учтено ${ops?.stock_units??0} единиц техники.`,`Источник: inventory_units_v2, только неархивные VIN в статусах «склад» и «резерв».`,`Капитал в остатках: ${new Intl.NumberFormat("ru-RU").format(ops?.stock_value_som??0)} сом; задержанных поставок: ${ops?.delayed_shipments??0}.`,`Действие: проверьте просроченные ETA и карточки VIN без ответственного.`]:topic==="demand"?[`Что произошло: больше всего согласованных просмотров у ${top?data.catalog.find(p=>p.slug===top.tractor_slug)?.model??top.tractor_slug:"моделей пока не определено"}.`,`Источник: события просмотра и отдельная CRM-воронка; просмотр не считается лидом.`,`Данные: ${top?.views??0} просмотров, ${top?.leads??0} лидов, ${top?.sales??0} продаж.`,`Действие: оценивайте закупку только после переходов в квалификацию, предложение и продажу.`]:topic==="tasks"?[`Что произошло: открыто ${tasks?.open??0} задач, из них просрочено ${tasks?.overdue??0}.`,`Источник: crm_tasks; учитываются только незавершённые задачи.`,`Сделок без следующего шага: ${ops?.deals_without_next_step??0}.`,`Действие: назначьте ответственных и следующий шаг по каждой активной сделке.`]:[`Что произошло: оформлено ${deals?.won??0} продаж, активных сделок: ${deals?.active??0}.`,`Источник выручки: sales_v2, источник денег: payments_v2 и движения счетов.`,`Признанная выручка: ${new Intl.NumberFormat("ru-RU").format(Math.round((deals?.revenue_minor??0)/100))} сом; денежный остаток: ${new Intl.NumberFormat("ru-RU").format(ops?.cash_balance_som??0)} сом.`,`Действие: проверьте долги и сделки без следующего шага.`]);}return <div className="admin-content"><section className="admin-panel director-page"><PageHeading title="Аналитический помощник" text="Это детерминированный анализатор системных данных, а не генеративный AI. Каждый ответ указывает источник показателя."/><form className="ai-director-form" onSubmit={ask}><label><span>Вопрос по данным</span><textarea value={question} onChange={event=>setQuestion(event.target.value)} rows={4} required placeholder="Например: что сейчас требует внимания в продажах?"/></label><button className="admin-primary" type="submit"><Bot/>Получить разбор</button></form>{answer?<ol className="ai-director-answer">{answer.map(item=><li key={item}>{item}</li>)}</ol>:null}</section></div>}

function Profile({ data, save }: { data: DashboardData | null; save: (profile: { displayName: string; phone: string; avatar:string; theme:string;position:string;department:string;skills:string;bio:string }) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const f = new FormData(event.currentTarget); save({ displayName: String(f.get("displayName")), phone: String(f.get("phone")), avatar:String(f.get("avatar")), theme:String(f.get("theme")),position:String(f.get("position")),department:String(f.get("department")),skills:String(f.get("skills")),bio:String(f.get("bio")) }); }
  return <div className="admin-content"><form className="admin-panel profile-form" onSubmit={submit}><div className="profile-heading"><AvatarVisual avatar={data?.profile?.avatar ?? null} size={92} /><div><span className="panel-kicker">Настройки аккаунта</span><h2>Профиль сотрудника</h2><p>Заполните рабочую карточку и выберите личную цветовую тему. Каждый сотрудник редактирует свой профиль самостоятельно.</p></div></div><div className="profile-fields"><label><span>ФИО</span><input name="displayName" defaultValue={data?.profile?.display_name} required /></label><label><span>Рабочий телефон</span><input name="phone" defaultValue={data?.profile?.phone} /></label><label><span>Email для входа</span><input value={data?.profile?.email ?? ""} readOnly /></label><label><span>Должность</span><input name="position" defaultValue={data?.profile?.position}/></label><label><span>Отдел</span><input name="department" defaultValue={data?.profile?.department}/></label><label><span>Ссылка на аватар</span><input name="avatar" type="url" defaultValue={data?.profile?.avatar ?? ""} placeholder="https://…"/></label><label className="full"><span>Навыки</span><input name="skills" defaultValue={data?.profile?.skills} placeholder="Продажи, сервис, логистика"/></label><label className="full"><span>О себе</span><textarea name="bio" rows={4} defaultValue={data?.profile?.bio} placeholder="Коротко о вашей роли и опыте"/></label><label><span>Цвет кабинета</span><select name="theme" defaultValue={data?.profile?.theme ?? "blue"}><option value="blue">Синий</option><option value="violet">Фиолетовый</option><option value="forest">Тёмно-зелёный</option><option value="red">Красный</option></select></label></div><button type="submit" className="admin-primary">Сохранить профиль</button></form><SecurityPanel role={data?.profile?.role}/></div>;
}

type SecuritySession={id:string;created_at:string;last_seen_at:string;expires_at:number;user_agent:string;ip_hint:string;current:boolean};
type AuthEvent={id:string;event_type:string;created_at:string;user_agent:string;ip_hash:string};
// The initial request intentionally hydrates server-owned session state after the profile surface mounts.
// eslint-disable-next-line react-hooks/set-state-in-effect
function SecurityPanel({role}:{role?:string}){const [sessions,setSessions]=useState<SecuritySession[]>([]),[events,setEvents]=useState<AuthEvent[]>([]),[message,setMessage]=useState("");const minPassword=["owner","director"].includes(role??"")?12:8;const load=useCallback(async()=>{const response=await fetch("/api/admin/security",{cache:"no-store"}),body=await response.json() as {sessions?:SecuritySession[];events?:AuthEvent[];error?:string};if(!response.ok){setMessage(body.error??"Не удалось загрузить безопасность");return}setSessions(body.sessions??[]);setEvents(body.events??[])},[]);useEffect(()=>{void load()},[load]);async function act(payload:Record<string,unknown>){setMessage("");const response=await fetch("/api/admin/security",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}),body=await response.json() as {error?:string};setMessage(response.ok?"Настройки безопасности обновлены":body.error??"Действие не выполнено");if(response.ok)await load()}async function change(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget),next=String(form.get("newPassword")??""),repeat=String(form.get("repeat")??"");if(next!==repeat){setMessage("Новые пароли не совпадают");return}await act({action:"change_password",currentPassword:form.get("currentPassword"),newPassword:next});event.currentTarget.reset()}const eventLabels:Record<string,string>={login_success:"Успешный вход",login_failed:"Неудачная попытка входа",logout:"Выход",password_changed:"Пароль изменён",password_reset:"Доступ восстановлен",session_revoked:"Сессия завершена",sessions_revoked:"Другие сессии завершены"};return <section className="admin-panel security-panel"><PageHeading title="Безопасность аккаунта" text="Смена пароля, активные устройства и история авторизаций."/>{message?<p className="crm-message" role="status">{message}</p>:null}<form onSubmit={change} className="security-password-form"><label><span>Текущий пароль</span><input name="currentPassword" type="password" required autoComplete="current-password"/></label><label><span>Новый пароль</span><input name="newPassword" type="password" minLength={minPassword} maxLength={128} required autoComplete="new-password"/></label><label><span>Повторите пароль</span><input name="repeat" type="password" minLength={minPassword} maxLength={128} required autoComplete="new-password"/></label><button className="admin-primary" type="submit">Изменить пароль</button></form><div className="security-columns"><div><header><strong>Активные сессии</strong><button type="button" onClick={()=>void act({action:"revoke_others"})}>Завершить остальные</button></header>{sessions.map(session=><article key={session.id}><span><b>{session.current?"Текущее устройство":"Другое устройство"}</b><small>{session.user_agent||"Неизвестный браузер"}</small><time>{new Date(session.created_at).toLocaleString("ru-RU")} · активность {new Date(session.last_seen_at).toLocaleString("ru-RU")} · IP {session.ip_hint}</time></span>{!session.current?<button type="button" onClick={()=>void act({action:"revoke_session",id:session.id})}>Завершить</button>:null}</article>)}</div><div><header><strong>История входов</strong></header>{events.slice(0,12).map(item=><article key={item.id}><span><b>{eventLabels[item.event_type]??item.event_type}</b><time>{new Date(item.created_at).toLocaleString("ru-RU")}</time></span></article>)}</div></div></section>}

function emptyProduct(): TractorType { return { id: crypto.randomUUID(), slug: "", model: "", hp: 50, category: "Универсальные", farmArea: "до 30 га", price: null, discountPercent: null, promotionLabel: null, inStock: true, status:"draft", sortOrder:0, image: "/images/tractors-4k/cfb504-x.webp", images: ["/images/tractors-4k/cfb504-x.webp"], videoUrl: null, description: "", comfort: "", equipment: [], specs: {} }; }

function ProductEditor({ product, close, save }: { product: TractorType; close: () => void; save: (product: TractorType) => Promise<boolean>|boolean }) {
  const dialogRef = useRef<HTMLFormElement>(null);
  const [dirty,setDirty]=useState(false),[confirmClose,setConfirmClose]=useState(false);
  const [image,setImage]=useState(product.image),[galleryText,setGalleryText]=useState((product.images?.length ? product.images : [product.image]).join("\n")),[videoUrl,setVideoUrl]=useState(product.videoUrl??"");
  const requestClose=useCallback(()=>{if(dirty)setConfirmClose(true);else close()},[close,dirty]);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); requestClose(); return; }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    function handleUnload(event:BeforeUnloadEvent){if(dirty)event.preventDefault()}
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload",handleUnload);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload",handleUnload);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [dirty,requestClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const model = String(f.get("model"));
    const images = galleryText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    const equipment = String(f.get("equipment") ?? "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    const specs = Object.fromEntries(String(f.get("specs") ?? "").split(/\r?\n/).map((line) => {
      const separator = line.indexOf(":");
      return separator > 0 ? [line.slice(0, separator).trim(), line.slice(separator + 1).trim()] : null;
    }).filter((entry): entry is [string, string] => Boolean(entry?.[0] && entry?.[1])));
    const saved=await save({
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
      videoUrl: videoUrl.trim() || null,
      description: String(f.get("description")),
      comfort: String(f.get("comfort")),
      equipment,
      specs,
    });
    if(saved)setDirty(false);
  }
  const equipment = (product.equipment ?? []).join("\n");
  const specs = Object.entries(product.specs).map(([label, value]) => `${label}: ${value}`).join("\n");
  return <div className="editor-overlay"><button className="editor-backdrop" type="button" onClick={requestClose} aria-label="Закрыть редактор" /><form ref={dialogRef} className="product-editor" onSubmit={submit} onChange={()=>setDirty(true)} role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
    <header><div><span>Карточка товара</span><h2 id="product-editor-title">{product.model || "Новый трактор"}</h2></div><button type="button" onClick={requestClose} aria-label="Закрыть"><X /></button></header>
    <div className="editor-sections">
      <fieldset><legend>Основные данные</legend><div className="editor-fields"><label><span>Модель</span><input name="model" defaultValue={product.model} required /></label><label><span>Slug</span><input name="slug" defaultValue={product.slug} placeholder="создастся автоматически" /></label><label><span>Мощность, л.с.</span><input name="hp" type="number" min="20" max="500" defaultValue={product.hp} required /></label><label><span>Категория</span><select name="category" defaultValue={product.category}><option>Универсальные</option><option>Средний класс</option><option>Тяжёлый класс</option></select></label><label><span>Площадь</span><input name="farmArea" defaultValue={product.farmArea} /></label><label className="editor-check"><input type="checkbox" name="inStock" defaultChecked={product.inStock} /><span>Есть в наличии</span></label></div></fieldset>
      <fieldset><legend>Цена и витрина</legend><div className="editor-fields"><label><span>Цена, сом</span><input name="price" type="number" min="0" defaultValue={product.price ?? ""} placeholder="Цена по запросу" /></label><label><span>Скидка, %</span><input name="discountPercent" type="number" min="0" max="90" defaultValue={product.discountPercent ?? ""} placeholder="Например, 10" /></label><label><span>Статус публикации</span><select name="status" defaultValue={product.status??"published"}><option value="draft">Черновик</option><option value="published">Опубликовано</option><option value="hidden">Скрыто</option><option value="archived">Архив</option></select></label><label><span>Порядок</span><input name="sortOrder" type="number" min="0" defaultValue={product.sortOrder??0}/></label><label className="full"><span>Название акции</span><input name="promotionLabel" defaultValue={product.promotionLabel ?? ""} placeholder="Например: Сезонная выгода" /></label><label className="editor-check"><input type="checkbox" name="popular" defaultChecked={product.popular}/><span>Популярная модель</span></label><label className="editor-check"><input type="checkbox" name="recommended" defaultChecked={product.recommended}/><span>Рекомендуем</span></label></div></fieldset>
      <fieldset><legend>Описание и комплектация</legend><div className="editor-fields"><label className="full"><span>Описание товара</span><textarea name="description" rows={6} defaultValue={product.description} placeholder="Что умеет трактор и для каких работ подходит" required /><small>Коротко и конкретно: назначение, сильные стороны и выгода для хозяйства.</small></label><label className="full"><span>Комфорт оператора</span><textarea name="comfort" rows={4} defaultValue={product.comfort} placeholder="Кабина, посадка, обзор, органы управления" /></label><label className="full"><span>Комплектация: одна позиция на строку</span><textarea name="equipment" rows={7} defaultValue={equipment} placeholder="Кабина с отопителем&#10;Передние противовесы&#10;Гидравлические выходы" /><small>Эти пункты появятся на странице трактора отдельным понятным списком.</small></label></div></fieldset>
      <fieldset><legend>Фото и видео</legend><div className="editor-fields"><label className="full"><span>Основное изображение</span><input name="image" value={image} onChange={event=>setImage(event.target.value)} required /><AdminMediaUpload label="Загрузить основное фото" onUploaded={urls=>{setImage(urls[0]);setDirty(true)}}/><small>Путь /images/... или публичная ссылка из хранилища.</small></label><label className="full"><span>Галерея: одно фото на строку</span><textarea name="images" rows={7} value={galleryText} onChange={event=>setGalleryText(event.target.value)} /><AdminMediaUpload multiple label="Добавить фото в галерею" onUploaded={urls=>{setGalleryText(current=>[current,...urls].filter(Boolean).join("\n"));setDirty(true)}}/><small>Первым будет основное изображение. Добавьте фото с разных сторон, кабины и двигателя.</small></label><label className="full"><span>Видео товара</span><input name="videoUrl" type="url" value={videoUrl} onChange={event=>setVideoUrl(event.target.value)} placeholder="https://.../video.mp4" /><small>Для больших видео используйте публичную ссылку CDN, чтобы не превышать лимит серверной загрузки.</small></label></div></fieldset>
      <fieldset><legend>Технические характеристики</legend><div className="editor-fields"><label className="full"><span>Название: значение: одна характеристика на строку</span><textarea name="specs" rows={10} defaultValue={specs} placeholder="Модель двигателя: CF...&#10;Колёсная база: 2200 мм" /></label></div></fieldset>
    </div>
    <footer><button type="button" onClick={requestClose}>Отмена</button><button className="admin-primary" type="submit"><Check size={17} aria-hidden="true" />Сохранить товар</button></footer>
    {confirmClose?<div className="unsaved-confirm" role="alert"><strong>Есть несохранённые изменения</strong><span>Закрыть карточку и потерять изменения?</span><button type="button" onClick={()=>setConfirmClose(false)}>Продолжить</button><button type="button" className="record-delete" onClick={close}>Закрыть без сохранения</button></div>:null}
  </form></div>;
}
