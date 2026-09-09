"use client";

import { useState } from "react";
import { ArrowRight, BarChart3, Bot, Boxes, BriefcaseBusiness, Calculator, CircleDollarSign, ClipboardCheck, FileText, Gauge, Headphones, ImageIcon, Landmark, LayoutDashboard, ListChecks, MapPin, Megaphone, MessageSquareText, Newspaper, Percent, Settings, ShieldCheck, Sparkles, Target, Tractor, TrendingUp, UserRoundCog, UsersRound, Warehouse, Wrench } from "lucide-react";
import type { AdminWorkspace } from "./AdminPortalHome";

export type WorkspaceSection="overview"|"deals"|"customers"|"tasks"|"products"|"news"|"leads"|"analytics"|"inventory"|"calculations"|"costs"|"team"|"audit"|"site"|"profile";

type OverviewData={
  actor:{role:"owner"|"manager"};
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
    goals?:{sales:number;revenueMinor:number};
  };
};

const marketing=[
  ["site","Главная и баннеры","Первый экран, контакты и изображения",LayoutDashboard],
  ["products","Каталог","Модели, характеристики и цены",Tractor],
  ["news","Новости","Публикации и новые модели",Newspaper],
  ["products","Акции","Скидки и специальные предложения",Megaphone],
  ["calculations","Лизинг","Предварительный расчёт условий",Landmark],
  ["site","Сервис","Тексты и сервисные баннеры",Wrench],
  ["products","Запчасти","Контент по комплектующим",Boxes],
  ["site","Галерея","Визуальные материалы сайта",ImageIcon],
  ["site","FAQ","Ответы на частые вопросы",MessageSquareText],
  ["site","Контакты","Адреса, телефоны и филиалы",MapPin],
  ["leads","Заявки с сайта","Новые обращения покупателей",ClipboardCheck],
  ["analytics","Аналитика","Трафик и интерес к моделям",BarChart3],
] as const;

const company=[
  ["deals","CRM и сделки","Воронка от заявки до продажи",BriefcaseBusiness],
  ["customers","Клиенты","Карточки и история обращений",UsersRound],
  ["deals","Продажи","Суммы, этапы и ответственные",TrendingUp],
  ["inventory","Склад","Наличие и техника под заказ",Warehouse],
  ["costs","Себестоимость","Закупка и маржа по моделям",Percent],
  ["calculations","Рассрочки и лизинг","График и предварительный платёж",Calculator],
  ["tasks","Сервис и гарантия","Задачи по обслуживанию клиентов",Headphones],
  ["team","Сотрудники","Роли, доступы и команда",UserRoundCog],
  ["audit","Документы и журнал","История важных действий",FileText],
  ["tasks","Задачи","Сроки, ответственные и статусы",ListChecks],
  ["analytics","Отчёты","Посещаемость и спрос",Gauge],
  ["profile","Настройки","Профиль и рабочая тема",Settings],
] as const;

function money(minor:number|undefined){return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(Math.round((Number(minor)||0)/100))+" сом"}
const stageLabels:Record<string,string>={new:"Новая",ai:"AI-обработка",qualified:"Квалифицирована",contacted:"Связались",meeting:"Встреча",proposal:"Предложение",negotiation:"Переговоры",reserved:"Бронь",contract:"Договор",awaiting_payment:"Ожидание оплаты",won:"Продано",lost:"Отказ"};

export function AdminWorkspaceOverview({workspace,data,onNavigate,onSaveGoals}:{workspace:AdminWorkspace;data:OverviewData;onNavigate:(section:WorkspaceSection)=>void;onSaveGoals:(goals:{sales:number;revenueMinor:number})=>Promise<boolean>}){
  const newLeads=data.leads.filter(item=>item.status==="new").length;
  if(workspace==="marketing")return <div className="admin-workspace-dashboard"><WorkspaceHero icon={Megaphone} eyebrow="Маркетинг" title="Управление публичным сайтом" text="Контент, заявки и статистика собраны в одном рабочем пространстве."/><div className="workspace-kpis"><Kpi label="Моделей" value={data.catalog.length} note="в каталоге"/><Kpi label="Публикаций" value={data.posts.filter(item=>item.status==="published").length} note="опубликовано"/><Kpi label="Новых заявок" value={newLeads} note="ожидают ответа"/><Kpi label="Просмотров" value={data.totals?.views??0} note="с согласия посетителей"/></div><ModuleGrid modules={marketing} onNavigate={onNavigate}/></div>;
  if(workspace==="company")return <div className="admin-workspace-dashboard"><WorkspaceHero icon={BriefcaseBusiness} eyebrow="Управление компанией" title="CRM, продажи и операционная работа" text="Каждый раздел открывает существующий рабочий модуль — без демонстрационных цифр."/><div className="workspace-kpis"><Kpi label="Активных сделок" value={data.director?.deals?.active??0} note="в текущей воронке"/><Kpi label="Техники в наличии" value={data.catalog.filter(item=>item.inStock).length} note="позиций каталога"/><Kpi label="Открытых задач" value={data.director?.tasks?.open??0} note="у команды"/><Kpi label="Продаж" value={data.director?.deals?.won??0} note="закрыто успешно"/></div><ModuleGrid modules={data.actor.role==="owner"?company:company.filter(([section])=>!["costs","team","audit"].includes(section))} onNavigate={onNavigate}/></div>;
  return <ControlCenter data={data} onNavigate={onNavigate} onSaveGoals={onSaveGoals}/>;
}

function WorkspaceHero({icon:Icon,eyebrow,title,text}:{icon:typeof Megaphone;eyebrow:string;title:string;text:string}){return <section className="workspace-hero"><div><i><Icon aria-hidden="true"/></i><span>{eyebrow}</span></div><h2>{title}</h2><p>{text}</p></section>}
function Kpi({label,value,note}:{label:string;value:string|number;note:string}){return <article><span>{label}</span><strong>{value}</strong><small>{note}</small></article>}
function ModuleGrid({modules,onNavigate}:{modules:readonly (readonly [WorkspaceSection,string,string,typeof LayoutDashboard])[];onNavigate:(section:WorkspaceSection)=>void}){return <section className="workspace-module-grid">{modules.map(([section,title,text,Icon],index)=><button type="button" key={`${section}-${title}`} onClick={()=>onNavigate(section)}><i><Icon aria-hidden="true"/></i><span><small>{String(index+1).padStart(2,"0")}</small><strong>{title}</strong><em>{text}</em></span><ArrowRight aria-hidden="true"/></button>)}</section>}

function ControlCenter({data,onNavigate,onSaveGoals}:{data:OverviewData;onNavigate:(section:WorkspaceSection)=>void;onSaveGoals:(goals:{sales:number;revenueMinor:number})=>Promise<boolean>}){
  const [question,setQuestion]=useState<"sales"|"attention"|"demand">("attention");
  const goals=data.director?.goals??{sales:0,revenueMinor:0};const deals=data.director?.deals;const tasks=data.director?.tasks;const top=data.popular[0];const topModel=data.catalog.find(item=>item.slug===top?.tractor_slug)?.model;
  const answer=question==="sales"?`${deals?.won??0} сделок закрыто успешно. Подтверждённая сумма: ${money(deals?.revenue_minor)}. План берётся из формы ниже.`:question==="demand"?(topModel?`Больше всего согласованных просмотров у ${topModel}: ${top.views}. Это интерес к странице, не подтверждённая продажа.`:"Данных о спросе пока недостаточно: аналитика учитывается только после согласия посетителя."):`Новых заявок: ${data.leads.filter(item=>item.status==="new").length}. Просроченных задач: ${tasks?.overdue??0}. Техники в наличии: ${data.catalog.filter(item=>item.inStock).length}.`;
  return <div className="admin-workspace-dashboard control-dashboard"><WorkspaceHero icon={BarChart3} eyebrow="Центр управления" title="Решения на основе фактических данных" text="Факты отделены от планов и прогнозов. Никаких придуманных сумм."/><div className="workspace-kpis"><Kpi label="Активные сделки" value={deals?.active??0} note="факт из SQL"/><Kpi label="Выручка" value={money(deals?.revenue_minor)} note="только выигранные сделки"/><Kpi label="Прибыль" value={money(deals?.profit_minor)} note="где указана себестоимость"/><Kpi label="Новые лиды · 30 дней" value={data.director?.period?.leads_30??0} note="факт из CRM"/></div>
    <div className="control-grid"><section className="control-panel attention-panel"><header><div><ShieldCheck/><span><small>Контроль</small><h3>Требует внимания</h3></span></div><button type="button" onClick={()=>onNavigate("tasks")}>Все задачи</button></header><ul><li className={(tasks?.overdue??0)>0?"red":"green"}><i/>{tasks?.overdue??0} просроченных задач</li><li className={data.leads.some(item=>item.status==="new")?"yellow":"green"}><i/>{data.leads.filter(item=>item.status==="new").length} необработанных заявок</li><li className={data.catalog.filter(item=>item.inStock).length<3?"yellow":"green"}><i/>{data.catalog.filter(item=>item.inStock).length} моделей отмечено «в наличии»</li></ul></section>
    <section className="control-panel director-panel"><header><div><Bot/><span><small>Только реальные данные</small><h3>AI-директор</h3></span></div><Sparkles/></header><div className="director-questions"><button type="button" className={question==="attention"?"active":""} onClick={()=>setQuestion("attention")}>Что требует внимания?</button><button type="button" className={question==="sales"?"active":""} onClick={()=>setQuestion("sales")}>Как идут продажи?</button><button type="button" className={question==="demand"?"active":""} onClick={()=>setQuestion("demand")}>Какая модель интересует?</button></div><p>{answer}</p></section></div>
    <div className="control-grid"><GoalPanel goals={goals} won={deals?.won??0} revenue={deals?.revenue_minor??0} save={onSaveGoals}/><section className="control-panel pipeline-panel"><header><div><Target/><span><small>Воронка</small><h3>Сделки по этапам</h3></span></div><button type="button" onClick={()=>onNavigate("deals")}>Открыть CRM</button></header>{data.director?.pipeline?.length?<div>{data.director.pipeline.map(item=><p key={item.stage}><span>{stageLabels[item.stage]??item.stage}</span><strong>{item.count}</strong><i style={{width:`${Math.max(7,item.count/Math.max(...data.director!.pipeline!.map(row=>row.count))*100)}%`}}/></p>)}</div>:<p className="control-empty">Сделок пока нет. Новая заявка автоматически создаст карточку клиента и сделку.</p>}</section></div>
  </div>;
}

function GoalPanel({goals,won,revenue,save}:{goals:{sales:number;revenueMinor:number};won:number;revenue:number;save:(goals:{sales:number;revenueMinor:number})=>Promise<boolean>}){
  const [sales,setSales]=useState(goals.sales);const [revenueSom,setRevenueSom]=useState(Math.round(goals.revenueMinor/100));const salesProgress=sales?Math.min(100,won/sales*100):0;const revenueProgress=revenueSom?Math.min(100,revenue/100/revenueSom*100):0;
  return <section className="control-panel goal-panel"><header><div><Target/><span><small>План / факт</small><h3>Цели периода</h3></span></div></header><label><span>План продаж, шт.</span><input type="number" min="0" value={sales} onChange={event=>setSales(Number(event.target.value))}/></label><div className="goal-progress"><span style={{width:`${salesProgress}%`}}/><small>{won} из {sales||"—"} · {Math.round(salesProgress)}%</small></div><label><span>План выручки, сом</span><input type="number" min="0" step="1000" value={revenueSom} onChange={event=>setRevenueSom(Number(event.target.value))}/></label><div className="goal-progress"><span style={{width:`${revenueProgress}%`}}/><small>{money(revenue)} из {revenueSom?new Intl.NumberFormat("ru-RU").format(revenueSom):"—"} · {Math.round(revenueProgress)}%</small></div><button type="button" onClick={()=>void save({sales,revenueMinor:revenueSom*100})}><CircleDollarSign/>Сохранить цели</button></section>;
}
