"use client";

import { useState } from "react";
import { ArrowRight, BarChart3, Bot, Boxes, BriefcaseBusiness, Calculator, CircleDollarSign, ClipboardCheck, FileText, Headphones, ImageIcon, Landmark, LayoutDashboard, ListChecks, MapPin, Megaphone, MessageSquareText, Newspaper, Percent, Settings, ShieldCheck, Sparkles, Target, Tractor, TrendingUp, UserRoundCog, UsersRound, Warehouse, Wrench } from "lucide-react";
import type { AdminWorkspace } from "./AdminPortalHome";
import { Link } from "./SiteLink";

export type WorkspaceSection=string;

type DirectorGoals={sales:number;revenueMinor:number;profitMinor:number;leads:number;meetings:number;conversion:number};
type PeriodComparison={
  leads_current:number;leads_previous:number;sales_current:number;sales_previous:number;
  revenue_current_minor:number;revenue_previous_minor:number;profit_current_minor:number;profit_previous_minor:number;
  expenses_current_som:number;expenses_previous_som:number;
};

type OverviewData={
  actor:{role:"owner"|"director"|"manager"|"accountant"|"marketer"};
  catalog:Array<{inStock:boolean;model:string;slug:string;hp:number}>;
  leads:Array<{status:string}>;
  posts:Array<{status:string}>;
  popular:Array<{tractor_slug:string;views:number}>;
  totals:{views:number;visitors:number}|null;
  director?:{
    deals?:{total:number;active:number;won:number;revenue_minor:number;profit_minor:number}|null;
    tasks?:{total:number;open:number;overdue:number}|null;
    pipeline?:Array<{stage:string;count:number;amount_minor:number}>;
    period?:{views_30:number;visitors_30:number;leads_30:number}|null;
    goals?:DirectorGoals;
    operations?:{stock_units:number;active_shipments:number;meetings_30:number;income_som:number;expenses_som:number;debts_som:number;stock_value_som:number}|null;
    comparison?:PeriodComparison|null;
  };
};

const marketing=[
  ["home","Главная и баннеры","Первый экран, кнопки, изображения и порядок",LayoutDashboard],
  ["catalog","Каталог","Модели, характеристики и цены",Tractor],
  ["categories","Категории","Структура каталога",Boxes],
  ["news","Новости","Публикации и новые модели",Newspaper],
  ["promotions","Акции","Скидки и специальные предложения",Megaphone],
  ["leasing","Лизинг","Ставка, взнос, срок и комиссия",Landmark],
  ["public-service","Публичный сервис","Подробные сервисные страницы",Wrench],
  ["parts","Запчасти","Публичный ассортимент комплектующих",Boxes],
  ["attachments","Навесное оборудование","Совместимость и предложения",BriefcaseBusiness],
  ["gallery","Галерея","Фотографии, подписи и порядок",ImageIcon],
  ["reviews","Отзывы","Только подтверждённые истории клиентов",Sparkles],
  ["faq","FAQ","Категории, вопросы и ответы",MessageSquareText],
  ["branches","Контакты","Адреса, телефоны и филиалы",MapPin],
  ["site-leads","Заявки с сайта","Новые обращения покупателей",ClipboardCheck],
  ["site-analytics","Аналитика сайта","Трафик и интерес к моделям",BarChart3],
] as const;

const company=[
  ["deals","CRM и сделки","Воронка от заявки до продажи",BriefcaseBusiness],
  ["customers","Клиенты","Карточки и история обращений",UsersRound],
  ["reservations","Бронирования","Сроки, клиенты и техника",ClipboardCheck],
  ["sales","Проданные тракторы","Фактические продажи и выдача",TrendingUp],
  ["inventory-units","Склад техники","Учёт по VIN и серийному номеру",Warehouse],
  ["stock-parts","Склад запчастей","Остатки и резервы",Boxes],
  ["stock-attachments","Склад оборудования","Остатки навесного оборудования",BriefcaseBusiness],
  ["suppliers","Поставщики","Контакты и условия",UsersRound],
  ["purchases","Закупки","Заказы производителю",ClipboardCheck],
  ["shipments","Логистика","Поставки и ожидаемые даты",Warehouse],
  ["costs","Себестоимость","Закупка и маржа по моделям",Percent],
  ["finance","Доходы и расходы","Фактические операции",Calculator],
  ["debts","Задолженности","Долги и сроки оплаты",CircleDollarSign],
  ["documents","Документы","Договоры и файлы",FileText],
  ["service-cases","Сервис и гарантия","Внутренняя история по VIN",Headphones],
  ["team","Сотрудники","Роли, доступы и команда",UserRoundCog],
  ["tasks","Задачи","Сроки, ответственные и статусы",ListChecks],
  ["audit","Журнал действий","Понятная история изменений",FileText],
  ["profile","Настройки","Профиль и рабочая тема",Settings],
] as const;

function money(minor:number|undefined){return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(Math.round((Number(minor)||0)/100))+" сом"}
function moneySom(value:number|undefined){return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(Math.round(Number(value)||0))+" сом"}
function changeNote(current:number|undefined,previous:number|undefined){const now=Number(current)||0;const before=Number(previous)||0;if(!before)return now?"новое за 30 дней":"без изменений";const delta=Math.round((now-before)/before*100);return `${delta>=0?"+":""}${delta}% к прошлым 30 дням`}
const stageLabels:Record<string,string>={new:"Новая",ai:"AI-обработка",qualified:"Квалифицирована",contacted:"Связались",meeting:"Встреча",proposal:"Предложение",negotiation:"Переговоры",reserved:"Бронь",contract:"Договор",awaiting_payment:"Ожидание оплаты",won:"Продано",lost:"Отказ"};

export function AdminWorkspaceOverview({workspace,data,onNavigate,onSaveGoals}:{workspace:AdminWorkspace;data:OverviewData;onNavigate:(section:WorkspaceSection)=>void;onSaveGoals:(goals:DirectorGoals)=>Promise<boolean>}){
  const newLeads=data.leads.filter(item=>item.status==="new").length;
  if(workspace==="marketing")return <div className="admin-workspace-dashboard"><WorkspaceHero icon={Megaphone} eyebrow="Маркетинг" title="Управление публичным сайтом" text="Контент, заявки и статистика собраны в одном рабочем пространстве."/><div className="workspace-kpis"><Kpi label="Моделей" value={data.catalog.length} note="в каталоге"/><Kpi label="Публикаций" value={data.posts.filter(item=>item.status==="published").length} note="опубликовано"/><Kpi label="Новых заявок" value={newLeads} note="ожидают ответа"/><Kpi label="Просмотров" value={data.totals?.views??0} note="с согласия посетителей"/></div><ModuleGrid modules={marketing} onNavigate={onNavigate}/></div>;
  if(workspace==="company"){
    const deals=data.director?.deals;const operations=data.director?.operations;const conversion=newLeads?Math.round((deals?.won??0)/newLeads*1000)/10:0;
    return <div className="admin-workspace-dashboard"><WorkspaceHero icon={BriefcaseBusiness} eyebrow="Управление компанией" title="CRM, продажи и операционная работа" text="Фактические показатели и самостоятельные рабочие модули собраны в общей SQL-системе."/><div className="workspace-kpis company-kpis"><Kpi label="Выручка" value={money(deals?.revenue_minor)} note="выигранные сделки"/><Kpi label="Расходы" value={moneySom(operations?.expenses_som)} note="проведённые операции"/><Kpi label="Прибыль" value={money(deals?.profit_minor)} note="с заполненной себестоимостью"/><Kpi label="Новые заявки" value={newLeads} note="ожидают обработки"/><Kpi label="Конверсия" value={`${conversion}%`} note="продажи к новым заявкам"/><Kpi label="Активные сделки" value={deals?.active??0} note="в текущей воронке"/><Kpi label="Продажи" value={deals?.won??0} note="закрыто успешно"/><Kpi label="Задолженности" value={moneySom(operations?.debts_som)} note="открытые обязательства"/><Kpi label="Открытые задачи" value={data.director?.tasks?.open??0} note="у команды"/><Kpi label="Техника на складе" value={operations?.stock_units??0} note="физические единицы по VIN"/><Kpi label="Активные поставки" value={operations?.active_shipments??0} note="в логистике"/><Kpi label="Капитал в остатках" value={moneySom(operations?.stock_value_som)} note="закупка и расходы"/></div><ModuleGrid modules={["owner","director"].includes(data.actor.role)?company:company.filter(([section])=>!["costs","team","audit","finance","debts"].includes(section))} onNavigate={onNavigate}/></div>;
  }
  return <ControlCenter data={data} onNavigate={onNavigate} onSaveGoals={onSaveGoals}/>;
}

function WorkspaceHero({icon:Icon,eyebrow,title,text}:{icon:typeof Megaphone;eyebrow:string;title:string;text:string}){return <section className="workspace-hero"><div><i><Icon aria-hidden="true"/></i><span>{eyebrow}</span></div><h2>{title}</h2><p>{text}</p></section>}
function Kpi({label,value,note}:{label:string;value:string|number;note:string}){return <article><span>{label}</span><strong>{value}</strong><small>{note}</small></article>}
function ModuleGrid({modules,onNavigate}:{modules:readonly (readonly [string,string,string,typeof LayoutDashboard])[];onNavigate:(section:WorkspaceSection)=>void}){return <section className="workspace-module-grid">{modules.map(([section,title,text,Icon],index)=><button type="button" key={`${section}-${title}`} onClick={()=>onNavigate(section)}><i><Icon aria-hidden="true"/></i><span><small>{String(index+1).padStart(2,"0")}</small><strong>{title}</strong><em>{text}</em></span><ArrowRight aria-hidden="true"/></button>)}</section>}

function ControlCenter({data,onNavigate,onSaveGoals}:{data:OverviewData;onNavigate:(section:WorkspaceSection)=>void;onSaveGoals:(goals:DirectorGoals)=>Promise<boolean>}){
  const [question,setQuestion]=useState<"sales"|"attention"|"demand">("attention");
  const goals=data.director?.goals??{sales:0,revenueMinor:0,profitMinor:0,leads:0,meetings:0,conversion:0};const deals=data.director?.deals;const tasks=data.director?.tasks;const operations=data.director?.operations;const comparison=data.director?.comparison;const top=data.popular[0];const topModel=data.catalog.find(item=>item.slug===top?.tractor_slug)?.model;const conversion=(data.director?.period?.leads_30??0)>0?Math.round((comparison?.sales_current??0)/(data.director?.period?.leads_30??1)*1000)/10:0;
  const answer=question==="sales"?`${deals?.won??0} сделок закрыто успешно. Подтверждённая сумма: ${money(deals?.revenue_minor)}. План берётся из формы ниже.`:question==="demand"?(topModel?`Больше всего согласованных просмотров у ${topModel}: ${top.views}. Это интерес к странице, не подтверждённая продажа.`:"Данных о спросе пока недостаточно: аналитика учитывается только после согласия посетителя."):`Новых заявок: ${data.leads.filter(item=>item.status==="new").length}. Просроченных задач: ${tasks?.overdue??0}. Техники в наличии: ${data.catalog.filter(item=>item.inStock).length}.`;
  return <div className="admin-workspace-dashboard control-dashboard"><WorkspaceHero icon={BarChart3} eyebrow="Центр управления" title="Решения на основе фактических данных" text="Факты отделены от планов и прогнозов. Никаких придуманных сумм."/><div className="workspace-kpis company-kpis"><Kpi label="Продажи · 30 дней" value={comparison?.sales_current??0} note={changeNote(comparison?.sales_current,comparison?.sales_previous)}/><Kpi label="Выручка · 30 дней" value={money(comparison?.revenue_current_minor)} note={changeNote(comparison?.revenue_current_minor,comparison?.revenue_previous_minor)}/><Kpi label="Расходы · 30 дней" value={moneySom(comparison?.expenses_current_som)} note={changeNote(comparison?.expenses_current_som,comparison?.expenses_previous_som)}/><Kpi label="Прибыль · 30 дней" value={money(comparison?.profit_current_minor)} note={changeNote(comparison?.profit_current_minor,comparison?.profit_previous_minor)}/><Kpi label="Лиды · 30 дней" value={comparison?.leads_current??0} note={changeNote(comparison?.leads_current,comparison?.leads_previous)}/><Kpi label="Конверсия" value={`${conversion}%`} note="продажи к лидам периода"/><Kpi label="Задолженности" value={moneySom(operations?.debts_som)} note="открытые обязательства"/><Kpi label="Техника на складе" value={operations?.stock_units??0} note="физические единицы"/><Kpi label="Активные поставки" value={operations?.active_shipments??0} note="факт из логистики"/><Kpi label="Открытые задачи" value={tasks?.open??0} note={`${tasks?.overdue??0} просрочено`}/></div>
    <div className="control-grid"><section className="control-panel attention-panel"><header><div><ShieldCheck/><span><small>Контроль</small><h3>Требует внимания</h3></span></div></header><ul><li className={(tasks?.overdue??0)>0?"red":"green"}><span><i/><b>{tasks?.overdue??0} просроченных задач</b><small>{(tasks?.overdue??0)>0?"Срок выполнения уже прошёл.":"Просроченных действий нет."}</small></span><Link href="/admin/company/tasks">Открыть задачи</Link></li><li className={data.leads.some(item=>item.status==="new")?"yellow":"green"}><span><i/><b>{data.leads.filter(item=>item.status==="new").length} необработанных заявок</b><small>Новые обращения ещё не переведены в работу.</small></span><Link href="/admin/marketing/site-leads">Открыть заявки</Link></li><li className={(operations?.stock_units??0)<3?"yellow":"green"}><span><i/><b>{operations?.stock_units??0} физических единиц на складе</b><small>{(operations?.stock_units??0)<3?"Проверьте остатки и ожидаемые поставки.":"Остаток выше контрольного минимума."}</small></span><Link href="/admin/company/inventory-units">Открыть склад</Link></li></ul></section>
    <section className="control-panel director-panel"><header><div><Bot/><span><small>Только реальные данные</small><h3>AI-директор</h3></span></div><Sparkles/></header><div className="director-questions"><button type="button" className={question==="attention"?"active":""} onClick={()=>setQuestion("attention")}>Что требует внимания?</button><button type="button" className={question==="sales"?"active":""} onClick={()=>setQuestion("sales")}>Как идут продажи?</button><button type="button" className={question==="demand"?"active":""} onClick={()=>setQuestion("demand")}>Какая модель интересует?</button></div><p>{answer}</p></section></div>
    <div className="control-grid"><GoalPanel goals={goals} won={deals?.won??0} revenue={deals?.revenue_minor??0} save={onSaveGoals}/><section className="control-panel pipeline-panel"><header><div><Target/><span><small>Воронка</small><h3>Сделки по этапам</h3></span></div><Link href="/admin/company/deals">Открыть связанную CRM</Link></header>{data.director?.pipeline?.length?<div>{data.director.pipeline.map(item=><p key={item.stage}><span>{stageLabels[item.stage]??item.stage}</span><strong>{item.count}</strong><i style={{width:`${Math.max(7,item.count/Math.max(...data.director!.pipeline!.map(row=>row.count))*100)}%`}}/></p>)}</div>:<p className="control-empty">Сделок пока нет. Новая заявка автоматически создаст карточку клиента и сделку.</p>}</section></div>
    <ModuleGrid modules={[["control-plan","План / факт","Продажи, выручка, прибыль, лиды и встречи",Target],["control-models","Аналитика моделей","Просмотры → заявки → встречи → продажи",Tractor],["control-demand","Спрос и регионы","Мощность, назначение, бюджет и регионы",MapPin],["control-stock","Риски склада","Дефицит, залежавшаяся техника и капитал",Warehouse],["control-managers","Менеджеры","Сделки, продажи, выручка и задачи",UsersRound],["control-attribution","Сквозная аналитика","Канал → лид → продажа → прибыль",BarChart3],["control-forecast","Прогноз","Прогноз с явной маркировкой",TrendingUp],["control-ai","AI-директор","Свободные вопросы только по данным системы",Bot]] as const} onNavigate={onNavigate}/>
  </div>;
}

function GoalPanel({goals,won,revenue,save}:{goals:DirectorGoals;won:number;revenue:number;save:(goals:DirectorGoals)=>Promise<boolean>}){
  const [values,setValues]=useState({sales:goals.sales,revenueSom:Math.round(goals.revenueMinor/100),profitSom:Math.round(goals.profitMinor/100),leads:goals.leads,meetings:goals.meetings,conversion:goals.conversion});const salesProgress=values.sales?Math.min(100,won/values.sales*100):0;const revenueProgress=values.revenueSom?Math.min(100,revenue/100/values.revenueSom*100):0;const change=(key:keyof typeof values,value:number)=>setValues(current=>({...current,[key]:value}));
  return <section className="control-panel goal-panel"><header><div><Target/><span><small>План / факт</small><h3>Цели периода</h3></span></div></header><div className="goal-fields"><label><span>Продажи, шт.</span><input type="number" min="0" value={values.sales} onChange={event=>change("sales",Number(event.target.value))}/></label><label><span>Выручка, сом</span><input type="number" min="0" step="1000" value={values.revenueSom} onChange={event=>change("revenueSom",Number(event.target.value))}/></label><label><span>Прибыль, сом</span><input type="number" min="0" step="1000" value={values.profitSom} onChange={event=>change("profitSom",Number(event.target.value))}/></label><label><span>Лиды, шт.</span><input type="number" min="0" value={values.leads} onChange={event=>change("leads",Number(event.target.value))}/></label><label><span>Встречи, шт.</span><input type="number" min="0" value={values.meetings} onChange={event=>change("meetings",Number(event.target.value))}/></label><label><span>Конверсия, %</span><input type="number" min="0" max="100" step="0.1" value={values.conversion} onChange={event=>change("conversion",Number(event.target.value))}/></label></div><div className="goal-progress"><span style={{width:`${salesProgress}%`}}/><small>{won} продаж из {values.sales||"—"} · {Math.round(salesProgress)}%</small></div><div className="goal-progress"><span style={{width:`${revenueProgress}%`}}/><small>{money(revenue)} из {values.revenueSom?new Intl.NumberFormat("ru-RU").format(values.revenueSom)+" сом":"—"} · {Math.round(revenueProgress)}%</small></div><button type="button" onClick={()=>void save({sales:values.sales,revenueMinor:values.revenueSom*100,profitMinor:values.profitSom*100,leads:values.leads,meetings:values.meetings,conversion:values.conversion})}><CircleDollarSign/>Сохранить все цели</button></section>;
}
