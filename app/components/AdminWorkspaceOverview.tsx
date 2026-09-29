"use client";

import { useState } from "react";
import { ArrowRight, BarChart3, Bot, BriefcaseBusiness, Calculator, CircleDollarSign, Landmark, LayoutDashboard, MapPin, Megaphone, MessageSquareText, Newspaper, ShieldCheck, Sparkles, Target, Tractor, TrendingUp, UserRoundCog, UsersRound, Warehouse, Wrench } from "lucide-react";
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
  actor:{role:"owner"|"director"|"manager"|"accountant"|"marketer";display_name:string;position:string;department:string;permissions:string[]};
  catalog:Array<{inStock:boolean;availableUnits?:number;model:string;slug:string;hp:number}>;
  leads:Array<{status:string}>;
  posts:Array<{status:string}>;
  popular:Array<{tractor_slug:string;views:number}>;
  totals:{views:number;visitors:number}|null;
  director?:{
    deals?:{total:number;active:number;won:number;revenue_minor:number;paid_minor:number;profit_minor:number}|null;
    tasks?:{total:number;open:number;overdue:number}|null;
    pipeline?:Array<{stage:string;count:number;amount_minor:number}>;
    period?:{views_30:number;visitors_30:number;leads_30:number}|null;
    goals?:DirectorGoals;
    operations?:{stock_units:number;active_shipments:number;meetings_30:number;income_som:number;expenses_som:number;debts_som:number;stock_value_som:number;cash_balance_som:number;deals_without_next_step:number;delayed_shipments:number}|null;
    comparison?:PeriodComparison|null;
  };
};

const marketing=[
  ["catalog","Каталог","Модели, характеристики и цены",Tractor],
  ["news","Новости","Публикации и новые модели",Newspaper],
  ["public-service","Сервис","Материалы, изображения и ссылки",Wrench],
  ["faq","Чатбот","Частые вопросы и понятные ответы",MessageSquareText],
  ["leasing","Лизинг","Ставка, взнос, срок и комиссия",Landmark],
] as const;

const company=[
  ["deals","Сделки","Перетаскиваемая воронка от заявки до продажи",BriefcaseBusiness],
  ["inventory-units","Склад","VIN, себестоимость, цена и остаток",Warehouse],
  ["sales","Продажи","Автоматические и ручные продажи",TrendingUp],
  ["suppliers","Поставщики","Поставка, количество и общая сумма",UsersRound],
  ["finance","Расходы","Аренда, свет, вода и другие затраты",Calculator],
  ["team","Сотрудники","Роли, доступы и команда",UserRoundCog],
] as const;

function money(minor:number|undefined){return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(Math.round((Number(minor)||0)/100))+" сом"}
function moneySom(value:number|undefined){return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(Math.round(Number(value)||0))+" сом"}
function changeNote(current:number|undefined,previous:number|undefined){const now=Number(current)||0;const before=Number(previous)||0;if(!before)return now?"новое за 30 дней":"без изменений";const delta=Math.round((now-before)/before*100);return `${delta>=0?"+":""}${delta}% к прошлым 30 дням`}
const stageLabels:Record<string,string>={new:"Новая",ai:"AI-обработка",qualified:"Квалифицирована",contacted:"Связались",meeting:"Встреча",proposal:"Предложение",negotiation:"Переговоры",reserved:"Бронь",contract:"Договор",awaiting_payment:"Ожидание оплаты",won:"Продано",lost:"Отказ"};

export function AdminWorkspaceOverview({workspace,data,onNavigate,onSaveGoals}:{workspace:AdminWorkspace;data:OverviewData;onNavigate:(section:WorkspaceSection)=>void;onSaveGoals:(goals:DirectorGoals)=>Promise<boolean>}){
  const newLeads=data.leads.filter(item=>item.status==="new").length;
  const director=data.actor.role==="owner"||data.actor.role==="director";
  if(workspace==="marketing"){const modules=director?marketing:marketing.filter(([section])=>data.actor.permissions.includes(section));const leadsAccess=director||data.actor.permissions.includes("site-leads"),analyticsAccess=director||data.actor.permissions.includes("site-analytics");return <div className="admin-workspace-dashboard"><WorkspaceHero icon={Megaphone} eyebrow="Маркетинг" title="Управление публичным сайтом" text="Контент, заявки и статистика собраны в одном рабочем пространстве."/><div className="workspace-kpis"><Kpi label="Моделей" value={data.catalog.length} note="в каталоге"/><Kpi label="Публикаций" value={data.posts.filter(item=>item.status==="published").length} note="опубликовано"/><Kpi label="Новых заявок" value={leadsAccess?newLeads:"Н/Д"} note={leadsAccess?"ожидают ответа":"нет доступа"}/><Kpi label="Просмотров" value={analyticsAccess?data.totals?.views??0:"Н/Д"} note={analyticsAccess?"с согласия посетителей":"нет доступа"}/></div><ModuleGrid modules={modules} onNavigate={onNavigate}/></div>}
  if(workspace==="company"){
    const deals=data.director?.deals;const operations=data.director?.operations;
    const modules=director?company:company.filter(([section])=>data.actor.permissions.includes(section));
    const financeAccess=director||data.actor.permissions.includes("finance"),dealsAccess=director||data.actor.permissions.includes("deals"),leadsAccess=director||data.actor.permissions.includes("site-leads"),inventoryAccess=director||data.actor.permissions.includes("inventory-units");
    return <div className="admin-workspace-dashboard"><WorkspaceHero icon={BriefcaseBusiness} eyebrow="Управление компанией" title="Сделки, склад и деньги: в одной системе" text="Сделки, физический склад и фактические движения денег связаны, но рассчитываются раздельно."/><div className="workspace-kpis company-kpis"><Kpi label="Выручка" value={dealsAccess||financeAccess?money(deals?.revenue_minor):"Н/Д"} note={dealsAccess||financeAccess?"оформленные продажи":"нет доступа"}/><Kpi label="Фактически оплачено" value={financeAccess?money(deals?.paid_minor):"Н/Д"} note={financeAccess?"проведённые платежи":"нет доступа"}/><Kpi label="Денежный остаток" value={financeAccess?moneySom(operations?.cash_balance_som):"Н/Д"} note={financeAccess?"по счетам и кассам":"нет доступа"}/><Kpi label="Расходы" value={financeAccess?moneySom(operations?.expenses_som):"Н/Д"} note={financeAccess?"проведённые операции":"нет доступа"}/><Kpi label="Прибыль" value={financeAccess?money(deals?.profit_minor):"Н/Д"} note={financeAccess?"выручка минус фактическая себестоимость":"нет доступа"}/><Kpi label="Новые заявки" value={leadsAccess?newLeads:"Н/Д"} note={leadsAccess?"уже в воронке":"нет доступа"}/><Kpi label="Активные сделки" value={dealsAccess?deals?.active??0:"Н/Д"} note={dealsAccess?"в текущей воронке":"нет доступа"}/><Kpi label="Техника на складе" value={inventoryAccess?operations?.stock_units??0:"Н/Д"} note={inventoryAccess?"физические единицы по VIN":"нет доступа"}/></div><ModuleGrid modules={modules} onNavigate={onNavigate}/></div>;
  }
  if(data.actor.role!=="owner"&&data.actor.role!=="director")return <EmployeeHome data={data}/>;
  return <ControlCenter data={data} onNavigate={onNavigate} onSaveGoals={onSaveGoals}/>;
}

const employeeModules=[
  ["catalog","/admin/marketing/catalog","Каталог","Товары, цены и публикация",Tractor],
  ["news","/admin/marketing/news","Новости","Материалы публичного сайта",Newspaper],
  ["leasing-applications","/admin/marketing/leasing-applications","Лизинг","Заявки и варианты расчёта",Landmark],
  ["site-leads","/admin/marketing/site-leads","Заявки сайта","Новые обращения клиентов",MessageSquareText],
  ["deals","/admin/company/deals","CRM","Сделки и этапы продаж",BriefcaseBusiness],
  ["client-base","/admin/company/client-base","Клиенты","Контакты и история покупок",UsersRound],
  ["inventory-units","/admin/company/inventory-units","Склад","Техника и физические единицы",Warehouse],
  ["finance","/admin/company/finance","Финансы","Доходы, расходы и остаток",CircleDollarSign],
  ["employee-tasks","/admin/company/employee-tasks","Задачи","Личные и назначенные задачи",Target],
  ["chat","/admin/company/chat","Чат","Сообщения внутри компании",MessageSquareText],
] as const;

function EmployeeHome({data}:{data:OverviewData}){
  const allowed=employeeModules.filter(([permission])=>data.actor.permissions.includes(permission));
  const deals=data.director?.deals;const tasks=data.director?.tasks;const department=[data.actor.position,data.actor.department].filter(Boolean).join(" · ");
  const tasksAccess=data.actor.permissions.includes("employee-tasks"),dealsAccess=data.actor.permissions.includes("deals"),leadsAccess=data.actor.permissions.includes("site-leads"),catalogAccess=data.actor.permissions.includes("catalog")||data.actor.permissions.includes("inventory-units");
  const availableUnits=data.catalog.reduce((sum,item)=>sum+(item.availableUnits??0),0);
  return <div className="admin-workspace-dashboard employee-dashboard"><WorkspaceHero icon={BriefcaseBusiness} eyebrow={department||"Рабочее пространство"} title={`Здравствуйте, ${data.actor.display_name}`} text="Здесь собраны только те инструменты и данные, к которым вам предоставлен доступ."/><div className="workspace-kpis"><Kpi label="Открытые задачи" value={tasksAccess?tasks?.open??0:"Н/Д"} note={tasksAccess?`${tasks?.overdue??0} просрочено`:"нет доступа"}/><Kpi label="Активные сделки" value={dealsAccess?deals?.active??0:"Н/Д"} note={dealsAccess?"доступная вам воронка":"нет доступа"}/><Kpi label="Новые заявки" value={leadsAccess?data.leads.filter(item=>item.status==="new").length:"Н/Д"} note={leadsAccess?"ожидают обработки":"нет доступа"}/><Kpi label="Техника" value={catalogAccess?availableUnits:"Н/Д"} note={catalogAccess?"свободные VIN на складе":"нет доступа"}/></div><section className="workspace-module-grid" aria-label="Доступные разделы">{allowed.map(([permission,path,title,text,Icon],index)=><Link href={path} key={permission}><i><Icon aria-hidden="true"/></i><span><small>{String(index+1).padStart(2,"0")}</small><strong>{title}</strong><em>{text}</em></span><ArrowRight aria-hidden="true"/></Link>)}</section>{!allowed.length?<section className="control-panel"><p className="control-empty">Доступ к рабочим разделам пока не назначен. Профиль можно открыть через меню пользователя.</p></section>:null}</div>;
}

function WorkspaceHero({icon:Icon,eyebrow,title,text}:{icon:typeof Megaphone;eyebrow:string;title:string;text:string}){return <section className="workspace-hero"><div><i><Icon aria-hidden="true"/></i><span>{eyebrow}</span></div><h2>{title}</h2><p>{text}</p></section>}
function Kpi({label,value,note}:{label:string;value:string|number;note:string}){return <article><span>{label}</span><strong>{value}</strong><small>{note}</small></article>}
function ModuleGrid({modules,onNavigate}:{modules:readonly (readonly [string,string,string,typeof LayoutDashboard])[];onNavigate:(section:WorkspaceSection)=>void}){return <section className="workspace-module-grid">{modules.map(([section,title,text,Icon],index)=><button type="button" key={`${section}-${title}`} onClick={()=>onNavigate(section)}><i><Icon aria-hidden="true"/></i><span><small>{String(index+1).padStart(2,"0")}</small><strong>{title}</strong><em>{text}</em></span><ArrowRight aria-hidden="true"/></button>)}</section>}

function ControlCenter({data,onNavigate,onSaveGoals}:{data:OverviewData;onNavigate:(section:WorkspaceSection)=>void;onSaveGoals:(goals:DirectorGoals)=>Promise<boolean>}){
  const [question,setQuestion]=useState<"sales"|"attention"|"demand">("attention");
  const goals=data.director?.goals??{sales:0,revenueMinor:0,profitMinor:0,leads:0,meetings:0,conversion:0};const deals=data.director?.deals;const tasks=data.director?.tasks;const operations=data.director?.operations;const comparison=data.director?.comparison;const top=data.popular[0];const topModel=data.catalog.find(item=>item.slug===top?.tractor_slug)?.model;const conversion=(data.director?.period?.leads_30??0)>0?Math.round((comparison?.sales_current??0)/(data.director?.period?.leads_30??1)*1000)/10:0;
  const answer=question==="sales"?`${deals?.won??0} сделок закрыто успешно. Подтверждённая сумма: ${money(deals?.revenue_minor)}. План берётся из формы ниже.`:question==="demand"?(topModel?`Больше всего согласованных просмотров у ${topModel}: ${top.views}. Это интерес к странице, не подтверждённая продажа.`:"Данных о спросе пока недостаточно: аналитика учитывается только после согласия посетителя."):`Новых заявок: ${data.leads.filter(item=>item.status==="new").length}. Просроченных задач: ${tasks?.overdue??0}. Свободных VIN на складе: ${operations?.stock_units??0}.`;
  return <div className="admin-workspace-dashboard control-dashboard"><WorkspaceHero icon={BarChart3} eyebrow="Центр управления" title="Решения на основе фактических данных" text="Факты отделены от планов и прогнозов. Никаких придуманных сумм."/><div className="workspace-kpis company-kpis"><Kpi label="Продажи · 30 дней" value={comparison?.sales_current??0} note={changeNote(comparison?.sales_current,comparison?.sales_previous)}/><Kpi label="Выручка · 30 дней" value={money(comparison?.revenue_current_minor)} note={changeNote(comparison?.revenue_current_minor,comparison?.revenue_previous_minor)}/><Kpi label="Расходы · 30 дней" value={moneySom(comparison?.expenses_current_som)} note={changeNote(comparison?.expenses_current_som,comparison?.expenses_previous_som)}/><Kpi label="Прибыль · 30 дней" value={money(comparison?.profit_current_minor)} note={changeNote(comparison?.profit_current_minor,comparison?.profit_previous_minor)}/><Kpi label="Лиды · 30 дней" value={comparison?.leads_current??0} note={changeNote(comparison?.leads_current,comparison?.leads_previous)}/><Kpi label="Конверсия" value={`${conversion}%`} note="продажи к лидам периода"/><Kpi label="Задолженности" value={moneySom(operations?.debts_som)} note="открытые обязательства"/><Kpi label="Техника на складе" value={operations?.stock_units??0} note="физические единицы"/><Kpi label="Активные поставки" value={operations?.active_shipments??0} note="факт из логистики"/><Kpi label="Открытые задачи" value={tasks?.open??0} note={`${tasks?.overdue??0} просрочено`}/></div>
    <div className="control-grid"><section className="control-panel attention-panel"><header><div><ShieldCheck/><span><small>Контроль</small><h3>Требует внимания</h3></span></div></header><ul><li className={(tasks?.overdue??0)>0?"red":"green"}><span><i/><b>{tasks?.overdue??0} просроченных задач</b><small>{(tasks?.overdue??0)>0?"Срок выполнения уже прошёл.":"Просроченных действий нет."}</small></span><Link href="/admin/company/employee-tasks">Открыть задачи</Link></li><li className={data.leads.some(item=>item.status==="new")?"yellow":"green"}><span><i/><b>{data.leads.filter(item=>item.status==="new").length} необработанных заявок</b><small>Новые обращения ещё не переведены в работу.</small></span><Link href="/admin/marketing/site-leads">Открыть заявки</Link></li><li className={(operations?.deals_without_next_step??0)>0?"yellow":"green"}><span><i/><b>{operations?.deals_without_next_step??0} сделок без следующего шага</b><small>Активным сделкам нужен срок следующего действия.</small></span><Link href="/admin/company/deals">Открыть сделки</Link></li><li className={(operations?.debts_som??0)>0?"red":"green"}><span><i/><b>{moneySom(operations?.debts_som)} задолженности</b><small>Остаток по договорам за вычетом проведённых платежей.</small></span><Link href="/admin/company/debts">Открыть долги</Link></li><li className={(operations?.delayed_shipments??0)>0?"red":"green"}><span><i/><b>{operations?.delayed_shipments??0} задержанных поставок</b><small>ETA прошла, а поставка ещё не завершена.</small></span><Link href="/admin/company/shipments">Открыть логистику</Link></li><li className={(operations?.stock_units??0)<3?"yellow":"green"}><span><i/><b>{operations?.stock_units??0} физических единиц на складе</b><small>{(operations?.stock_units??0)<3?"Проверьте остатки и ожидаемые поставки.":"Остаток выше контрольного минимума."}</small></span><Link href="/admin/company/inventory-units">Открыть склад</Link></li></ul></section>
    <section className="control-panel director-panel"><header><div><Bot/><span><small>Только реальные данные</small><h3>Аналитический помощник</h3></span></div><Sparkles/></header><div className="director-questions"><button type="button" className={question==="attention"?"active":""} onClick={()=>setQuestion("attention")}>Что требует внимания?</button><button type="button" className={question==="sales"?"active":""} onClick={()=>setQuestion("sales")}>Как идут продажи?</button><button type="button" className={question==="demand"?"active":""} onClick={()=>setQuestion("demand")}>Какая модель интересует?</button></div><p>{answer}</p></section></div>
    <div className="control-grid"><GoalPanel goals={goals} won={deals?.won??0} revenue={deals?.revenue_minor??0} save={onSaveGoals}/><section className="control-panel pipeline-panel"><header><div><Target/><span><small>Воронка</small><h3>Сделки по этапам</h3></span></div><Link href="/admin/company/deals">Открыть связанную CRM</Link></header>{data.director?.pipeline?.length?<div>{data.director.pipeline.map(item=><p key={item.stage}><span>{stageLabels[item.stage]??item.stage}</span><strong>{item.count}</strong><i style={{width:`${Math.max(7,item.count/Math.max(...data.director!.pipeline!.map(row=>row.count))*100)}%`}}/></p>)}</div>:<p className="control-empty">Сделок пока нет. Новая заявка автоматически создаст карточку клиента и сделку.</p>}</section></div>
    <ModuleGrid modules={[["control-plan","План / факт","Продажи, выручка, прибыль, лиды и встречи",Target],["control-models","Аналитика моделей","Просмотры → заявки → встречи → продажи",Tractor],["control-demand","Спрос и регионы","Мощность, назначение, бюджет и регионы",MapPin],["control-attribution","Сквозная аналитика","Канал → лид → продажа → прибыль",BarChart3],["control-ai","Аналитический помощник","Детерминированные ответы по данным системы",Bot]] as const} onNavigate={onNavigate}/>
  </div>;
}

function GoalPanel({goals,won,revenue,save}:{goals:DirectorGoals;won:number;revenue:number;save:(goals:DirectorGoals)=>Promise<boolean>}){
  const [values,setValues]=useState({sales:goals.sales,revenueSom:Math.round(goals.revenueMinor/100),profitSom:Math.round(goals.profitMinor/100),leads:goals.leads,meetings:goals.meetings,conversion:goals.conversion});const salesProgress=values.sales?Math.min(100,won/values.sales*100):0;const revenueProgress=values.revenueSom?Math.min(100,revenue/100/values.revenueSom*100):0;const change=(key:keyof typeof values,value:number)=>setValues(current=>({...current,[key]:value}));
  return <section className="control-panel goal-panel"><header><div><Target/><span><small>План / факт</small><h3>Цели периода</h3></span></div></header><div className="goal-fields"><label><span>Продажи, шт.</span><input type="number" min="0" value={values.sales} onChange={event=>change("sales",Number(event.target.value))}/></label><label><span>Выручка, сом</span><input type="number" min="0" step="1000" value={values.revenueSom} onChange={event=>change("revenueSom",Number(event.target.value))}/></label><label><span>Прибыль, сом</span><input type="number" min="0" step="1000" value={values.profitSom} onChange={event=>change("profitSom",Number(event.target.value))}/></label><label><span>Лиды, шт.</span><input type="number" min="0" value={values.leads} onChange={event=>change("leads",Number(event.target.value))}/></label><label><span>Встречи, шт.</span><input type="number" min="0" value={values.meetings} onChange={event=>change("meetings",Number(event.target.value))}/></label><label><span>Конверсия, %</span><input type="number" min="0" max="100" step="0.1" value={values.conversion} onChange={event=>change("conversion",Number(event.target.value))}/></label></div><div className="goal-progress"><span style={{width:`${salesProgress}%`}}/><small>{won} продаж из {values.sales||"Н/Д"} · {Math.round(salesProgress)}%</small></div><div className="goal-progress"><span style={{width:`${revenueProgress}%`}}/><small>{money(revenue)} из {values.revenueSom?new Intl.NumberFormat("ru-RU").format(values.revenueSom)+" сом":"Н/Д"} · {Math.round(revenueProgress)}%</small></div><button type="button" onClick={()=>void save({sales:values.sales,revenueMinor:values.revenueSom*100,profitMinor:values.profitSom*100,leads:values.leads,meetings:values.meetings,conversion:values.conversion})}><CircleDollarSign/>Сохранить все цели</button></section>;
}
