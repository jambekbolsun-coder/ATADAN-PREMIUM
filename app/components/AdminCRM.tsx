"use client";

import { Check, ChevronLeft, ChevronRight, Clipboard, Clock3, GripVertical, Plus, RefreshCw, ShieldCheck, UserRoundPlus } from "lucide-react";
import Image from "next/image";
import QRCode from "qrcode";
import { type DragEvent, FormEvent, useCallback, useEffect, useState } from "react";
import type { Tractor } from "../types";

export type CrmMode = "deals" | "customers" | "tasks" | "team" | "costs" | "audit";
type Actor = { id:string; email:string; display_name:string; role:"owner"|"director"|"manager"|"accountant"|"marketer"; theme:string; phone:string; avatar:string|null };
type Deal = { id:string; title:string; tractor_slug:string|null; stage:string; amount_minor:number; cost_minor?:number|null; assigned_to:string|null; loss_reason:string; version:number; name:string; phone:string; updated_at:string };
type Customer = { id:string; name:string; phone:string; email:string; notes:string;region:string;source:string;tractor_slug:string|null;power:number|null;purpose:string;farm_area:string;budget_minor:number;purchase_method:string;purchase_timing:string;created_at:string;version:number };
type Task = { id:string; deal_id:string|null; title:string; assigned_to:string; due_at:string; done:number; version:number };
type Staff = { id:string; display_name:string; email:string; role:string; active:number };
type Cost = { slug:string; cost_minor:number; version:number };
type Audit = { id:string; action:string; entity_id:string; detail:string; created_at:string; display_name:string|null };
type Note = { id:string; deal_id:string; body:string; created_at:string; display_name:string };
type CrmData = { actor:Actor; deals:Deal[]; customers:Customer[]; tasks:Task[]; staff:Staff[]; costs:Cost[]; audit:Audit[]; notes:Note[] };
const stages = [["new","Новая заявка"],["ai","AI-консультация"],["qualified","Квалифицирован"],["meeting","Встреча"],["negotiation","Переговоры"],["reserved","Бронь"],["contract","Договор"],["awaiting_payment","Ожидание оплаты"],["won","Успешно продано"],["lost","Закрыто"]] as const;
const money=(minor:number)=>new Intl.NumberFormat("ru-RU").format(Math.round(minor/100))+" сом";

export function AdminCRM({mode,catalog,onSessionChange}:{mode:CrmMode;catalog:Tractor[];onSessionChange?:(actor:Actor)=>void}) {
  const [data,setData]=useState<CrmData|null>(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const load=useCallback(async()=>{
    const response=await fetch("/api/admin/crm",{cache:"no-store"});
    const body=await response.json() as CrmData&{error?:string};
    if(!response.ok) throw new Error(body.error||"Не удалось загрузить CRM");
    setData(body); onSessionChange?.(body.actor);
  },[onSessionChange]);
  useEffect(()=>{
    let cancelled=false;
    fetch("/api/admin/crm",{cache:"no-store"}).then(async response=>{
      const body=await response.json() as CrmData&{error?:string};
      if(!response.ok)throw new Error(body.error||"Не удалось загрузить CRM");
      if(!cancelled){setData(body);onSessionChange?.(body.actor);}
    }).catch(cause=>{if(!cancelled)setError(cause instanceof Error?cause.message:"Ошибка загрузки");});
    return()=>{cancelled=true;};
  },[onSessionChange]);
  async function action(payload:Record<string,unknown>) {
    setBusy(true);setError("");setNotice("");
    try {
      const response=await fetch("/api/admin/crm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const body=await response.json() as {error?:string};
      if(!response.ok) throw new Error(body.error||"Действие не выполнено");
      setNotice("Сохранено"); await load();
      return body;
    } catch(cause){setError(cause instanceof Error?cause.message:"Действие не выполнено");}
    finally{setBusy(false);}
  }
  if(!data)return <div className="admin-content"><div className="admin-panel crm-loading">{error||"Загружаем данные из SQL…"}</div></div>;
  return <div className="admin-content crm-workspace" aria-busy={busy}>
    <div className="crm-toolbar"><div><span>ATADAN SQL CRM</span><strong>{["owner","director"].includes(data.actor.role)?"Директор":data.actor.role==="accountant"?"Бухгалтер":data.actor.role==="marketer"?"Маркетолог":"Менеджер"} · {data.actor.display_name}</strong></div><button type="button" onClick={()=>void load()}><RefreshCw size={16}/>Обновить</button></div>
    {error?<p className="crm-message error" role="alert">{error}</p>:null}{notice?<p className="crm-message" role="status"><Check size={15}/>{notice}</p>:null}
    {mode==="deals"?<Deals data={data} catalog={catalog} action={action}/>:null}
    {mode==="customers"?<Customers customers={data.customers} action={action}/>:null}
    {mode==="tasks"?<Tasks data={data} action={action}/>:null}
    {mode==="team"?<Team data={data} action={action}/>:null}
    {mode==="costs"?<Costs data={data} catalog={catalog} action={action}/>:null}
    {mode==="audit"?<AuditLog rows={data.audit}/>:null}
  </div>;
}

function Deals({data,catalog,action}:{data:CrmData;catalog:Tractor[];action:(p:Record<string,unknown>)=>Promise<unknown>}) {
  const [dragOver,setDragOver]=useState<string|null>(null);
  async function create(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const f=new FormData(event.currentTarget);
    await action({action:"create_deal",name:f.get("name"),phone:f.get("phone"),title:f.get("title"),tractorSlug:f.get("tractorSlug"),amount:Number(f.get("amount")||0),assignedTo:f.get("assignedTo")});
    event.currentTarget.reset();
  }
  async function moveDeal(deal:Deal,target:string){
    if(deal.stage===target)return;
    const lossReason=target==="lost"?window.prompt("Укажите причину закрытия сделки")?.trim()||"":"";
    if(target==="lost"&&!lossReason)return;
    await action({action:"move_deal",id:deal.id,version:deal.version,stage:target,lossReason});
  }
  function drop(event:DragEvent<HTMLElement>,target:string){
    event.preventDefault();setDragOver(null);
    const id=event.dataTransfer.getData("text/plain"),deal=data.deals.find(item=>item.id===id);
    if(deal)void moveDeal(deal,target);
  }
  return <>
    <form className="admin-panel crm-create" onSubmit={create}>
      <header><div><span>Новая продажа</span><h2>Создать сделку</h2></div><Plus/></header>
      <label><span>Клиент</span><input name="name" required maxLength={120}/></label>
      <label><span>Телефон</span><input name="phone" required inputMode="tel" placeholder="+996…"/></label>
      <label><span>Название сделки</span><input name="title" required defaultValue="Продажа трактора Changfa"/></label>
      <label><span>Модель</span><select name="tractorSlug"><option value="">Не выбрана</option>{catalog.map((item)=><option key={item.slug} value={item.slug}>{item.model}</option>)}</select></label>
      <label><span>Сумма, сом</span><input name="amount" type="number" min="0" step="1"/></label>
      {["owner","director"].includes(data.actor.role)?<label><span>Ответственный</span><select name="assignedTo">{data.staff.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{s.display_name}</option>)}</select></label>:null}
      <button className="admin-primary" type="submit"><Plus size={17}/>Создать</button>
    </form>
    <section className="crm-pipeline" aria-label="Воронка сделок"><header><div><span>Воронка продаж</span><h2>Перетаскивайте сделки между этапами</h2></div><p><GripVertical/>Можно мышкой или кнопками в карточке</p></header><div className="crm-kanban">{stages.map(([id,label])=>{const deals=data.deals.filter(deal=>deal.stage===id);return <section className={`crm-kanban-column stage-${id}${dragOver===id?" drag-over":""}`} key={id} onDragEnter={()=>setDragOver(id)} onDragOver={event=>event.preventDefault()} onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setDragOver(null)}} onDrop={event=>drop(event,id)}><header><span>{label}</span><b>{deals.length}</b></header><div>{deals.map(deal=><DealCard key={deal.id} deal={deal} data={data} action={action} move={target=>void moveDeal(deal,target)}/>)}</div>{!deals.length?<p className="crm-kanban-empty">Перетащите сделку сюда</p>:null}</section>})}</div></section>
  </>;
}

function DealCard({deal,data,action,move}:{deal:Deal;data:CrmData;action:(p:Record<string,unknown>)=>Promise<unknown>;move:(stage:string)=>void}){
  const [loss,setLoss]=useState(deal.loss_reason||"");
  const [note,setNote]=useState("");
  async function update(event:FormEvent<HTMLFormElement>){event.preventDefault();const f=new FormData(event.currentTarget);await action({action:"update_deal",id:deal.id,version:deal.version,stage:f.get("stage"),amount:Number(f.get("amount")||0),assignedTo:f.get("assignedTo"),lossReason:loss});}
  const stageIndex=stages.findIndex(([id])=>id===deal.stage);
  function drag(event:DragEvent<HTMLElement>){event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",deal.id);}
  return <article className={"crm-deal stage-"+deal.stage}>
    <header><span>{stages.find(([id])=>id===deal.stage)?.[1]}</span><time>{new Date(deal.updated_at).toLocaleDateString("ru-RU")}</time><i className="crm-drag-handle" draggable onDragStart={drag} title="Перетащить сделку мышкой" aria-hidden="true"><GripVertical/></i></header>
    <h3>{deal.title}</h3><a href={"tel:"+deal.phone}>{deal.name} · {deal.phone}</a>
    {deal.tractor_slug?<p>{deal.tractor_slug}</p>:null}
    <div className="crm-money"><span>Продажа <strong>{money(deal.amount_minor)}</strong></span>{typeof deal.cost_minor==="number"?<span>Маржа <strong>{money(deal.amount_minor-deal.cost_minor)}</strong></span>:null}</div>
    <div className="crm-card-move"><button type="button" disabled={stageIndex<=0} onClick={()=>move(stages[stageIndex-1][0])} aria-label={`Переместить ${deal.title} на предыдущий этап`}><ChevronLeft/></button><span>Переместить</span><button type="button" disabled={stageIndex>=stages.length-1} onClick={()=>move(stages[stageIndex+1][0])} aria-label={`Переместить ${deal.title} на следующий этап`}><ChevronRight/></button></div>
    <details className="crm-deal-details"><summary>Открыть карточку</summary><form onSubmit={update}>
      <label><span>Этап</span><select name="stage" defaultValue={deal.stage} onChange={(e)=>{if(e.target.value!=="lost")setLoss("");}}>{stages.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <label><span>Сумма, сом</span><input name="amount" type="number" min="0" defaultValue={Math.round(deal.amount_minor/100)}/></label>
      {["owner","director"].includes(data.actor.role)?<label><span>Ответственный</span><select name="assignedTo" defaultValue={deal.assigned_to??""}>{data.staff.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{s.display_name}</option>)}</select></label>:null}
      <label><span>Причина отказа</span><input value={loss} onChange={e=>setLoss(e.target.value)} placeholder="Нужно при отказе"/></label>
      <button type="submit">Сохранить сделку</button>
      <div className="crm-notes">{data.notes.filter(item=>item.deal_id===deal.id).slice(0,2).map(item=><p key={item.id}><strong>{item.display_name}</strong>{item.body}</p>)}<label><span>Заметка</span><input value={note} onChange={e=>setNote(e.target.value)} maxLength={3000} placeholder="Итог разговора"/></label><button type="button" disabled={!note.trim()} onClick={async()=>{await action({action:"add_note",dealId:deal.id,body:note});setNote("");}}>Добавить заметку</button></div>
    </form></details>
  </article>;
}

function Customers({customers,action}:{customers:Customer[];action:(p:Record<string,unknown>)=>Promise<unknown>}){const [query,setQuery]=useState("");const visible=customers.filter(c=>`${c.name} ${c.phone} ${c.region} ${c.source}`.toLowerCase().includes(query.toLowerCase()));return <div className="admin-panel crm-table-card"><div className="panel-head"><div><span>Единая база</span><h2>Клиенты</h2></div><b>{visible.length}</b></div><label className="crm-customer-search"><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Найти клиента, телефон или регион" aria-label="Поиск клиентов"/></label><div className="crm-customer-list">{visible.map(c=><details key={c.id} className="crm-customer-card"><summary><i>{c.name.slice(0,1).toUpperCase()}</i><div><strong>{c.name}</strong><a href={"tel:"+c.phone} onClick={event=>event.stopPropagation()}>{c.phone}</a><small>{[c.region,c.source,c.tractor_slug].filter(Boolean).join(" · ")||"Карточка требует заполнения"}</small></div><time>{new Date(c.created_at).toLocaleDateString("ru-RU")}</time></summary><CustomerForm customer={c} action={action}/></details>)}{!visible.length?<Empty title="Клиенты не найдены" text={query?"Измените поисковый запрос.":"Они появятся из заявок сайта или новых сделок."}/>:null}</div></div>}
function CustomerForm({customer,action}:{customer:Customer;action:(p:Record<string,unknown>)=>Promise<unknown>}){async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const f=new FormData(event.currentTarget);await action({action:"update_customer",id:customer.id,version:customer.version,name:f.get("name"),phone:f.get("phone"),email:f.get("email"),region:f.get("region"),source:f.get("source"),tractorSlug:f.get("tractorSlug"),power:f.get("power"),purpose:f.get("purpose"),farmArea:f.get("farmArea"),budget:Number(f.get("budget")||0),purchaseMethod:f.get("purchaseMethod"),purchaseTiming:f.get("purchaseTiming"),notes:f.get("notes")});}return <form className="crm-customer-form" onSubmit={submit}>{[["name","ФИО",customer.name],["phone","Телефон",customer.phone],["email","Email",customer.email],["region","Регион",customer.region],["source","Источник",customer.source],["tractorSlug","Модель",customer.tractor_slug??""],["power","Мощность, л.с.",customer.power??""],["purpose","Назначение техники",customer.purpose],["farmArea","Площадь хозяйства",customer.farm_area],["budget","Бюджет, сом",Math.round(customer.budget_minor/100)||""],["purchaseMethod","Способ покупки",customer.purchase_method],["purchaseTiming","Срок покупки",customer.purchase_timing]].map(([name,label,value])=><label key={String(name)}><span>{label}</span><input name={String(name)} defaultValue={String(value)} required={name==="name"||name==="phone"} type={["power","budget"].includes(String(name))?"number":"text"}/></label>)}<label className="full"><span>Заметки и история</span><textarea name="notes" rows={4} defaultValue={customer.notes}/></label><button className="admin-primary" type="submit">Сохранить карточку</button></form>}

function Tasks({data,action}:{data:CrmData;action:(p:Record<string,unknown>)=>Promise<unknown>}){
  async function create(event:FormEvent<HTMLFormElement>){event.preventDefault();const f=new FormData(event.currentTarget);await action({action:"create_task",title:f.get("title"),dueAt:f.get("dueAt"),dealId:f.get("dealId"),assignedTo:f.get("assignedTo")});event.currentTarget.reset();}
  return <><form className="admin-panel crm-task-create" onSubmit={create}><div><span>Следующее действие</span><h2>Новая задача</h2></div><input name="title" aria-label="Название задачи" required placeholder="Позвонить клиенту"/><input name="dueAt" aria-label="Срок задачи" type="datetime-local" required/><select name="dealId" aria-label="Связанная сделка"><option value="">Без сделки</option>{data.deals.map(d=><option value={d.id} key={d.id}>{d.title}</option>)}</select>{["owner","director"].includes(data.actor.role)?<select name="assignedTo" aria-label="Ответственный">{data.staff.filter(s=>s.active).map(s=><option value={s.id} key={s.id}>{s.display_name}</option>)}</select>:null}<button className="admin-primary" type="submit">Добавить</button></form><div className="admin-panel crm-task-list">{data.tasks.map(task=><label key={task.id} className={task.done?"done":""}><input aria-label={task.done?`Вернуть задачу «${task.title}»`:`Завершить задачу «${task.title}»`} type="checkbox" checked={Boolean(task.done)} onChange={()=>void action({action:"toggle_task",id:task.id,done:!task.done,version:task.version})}/><span><strong>{task.title}</strong><small><Clock3 size={13}/>{new Date(task.due_at).toLocaleString("ru-RU")}</small></span></label>)}{!data.tasks.length?<Empty title="Задач пока нет" text="Добавьте следующий контакт или напоминание."/>:null}</div></>;
}

function Team({data,action}:{data:CrmData;action:(p:Record<string,unknown>)=>Promise<unknown>}){
  const [invite,setInvite]=useState("");
  const [role,setRole]=useState("manager");
  const [url,setUrl]=useState("");
  const [qr,setQr]=useState("");
  const [inviteError,setInviteError]=useState("");
  useEffect(()=>{if(url)QRCode.toDataURL(url,{width:260,margin:2,color:{dark:"#092f1d",light:"#ffffff"}}).then(setQr).catch(()=>setQr(""));},[url]);
  async function createInvite(event:FormEvent<HTMLFormElement>){event.preventDefault();setInviteError("");try{const response=await fetch("/api/admin/invites",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:invite,role})});const body=await response.json() as {url?:string;error?:string};if(!response.ok)throw new Error(body.error);setUrl(body.url||"");}catch(cause){setInviteError(cause instanceof Error?cause.message:"Не удалось создать приглашение");}}
  if(!["owner","director"].includes(data.actor.role))return <Empty title="Команда доступна директору" text="Ваши данные и задачи остаются доступны в личном кабинете."/>;
  const roleLabel=(value:string)=>({owner:"Владелец",director:"Директор",manager:"Менеджер",accountant:"Бухгалтер",marketer:"Маркетолог"} as Record<string,string>)[value]??value;
  return <><form className="admin-panel crm-invite" onSubmit={(e)=>void createInvite(e)}><div><span>Одноразовая ссылка</span><h2>Пригласить сотрудника</h2><p>Ссылка действует 24 часа. Сотрудник сам задаст имя и пароль.</p></div><input type="email" value={invite} onChange={e=>setInvite(e.target.value)} required placeholder="employee@example.com"/><select value={role} onChange={event=>setRole(event.target.value)} aria-label="Роль сотрудника"><option value="manager">Менеджер</option><option value="accountant">Бухгалтер</option><option value="marketer">Маркетолог</option></select>{inviteError?<p className="crm-message error" role="alert">{inviteError}</p>:null}<button className="admin-primary" type="submit"><UserRoundPlus size={17}/>Создать приглашение</button>{url?<div className="invite-result">{qr?<Image src={qr} alt="QR-код приглашения сотрудника" width={150} height={150} unoptimized/>:null}<code>{url}</code><button type="button" onClick={()=>void navigator.clipboard.writeText(url)}><Clipboard size={16}/>Копировать</button></div>:null}</form><div className="admin-panel crm-team">{data.staff.map(person=><article key={person.id}><i><ShieldCheck/></i><div><strong>{person.display_name}</strong><span>{person.email}</span><small>{roleLabel(person.role)}</small></div>{!["owner","director"].includes(person.role)?<span className="team-actions"><button className={person.active?"danger":""} type="button" onClick={()=>void action({action:"staff_active",id:person.id,active:!person.active})}>{person.active?"Заблокировать":"Разблокировать"}</button><button className="danger" type="button" onClick={()=>confirm(`Удалить доступ ${person.display_name}? История сделок сохранится.`)&&void action({action:"staff_delete",id:person.id})}>Удалить</button></span>:<b>{roleLabel(person.role)}</b>}</article>)}</div></>;
}

function Costs({data,catalog,action}:{data:CrmData;catalog:Tractor[];action:(p:Record<string,unknown>)=>Promise<unknown>}){
  if(!["owner","director"].includes(data.actor.role))return <Empty title="Финансы доступны директору" text="Закупочные цены скрыты от менеджеров."/>;
  return <div className="admin-panel crm-costs"><div className="panel-head"><div><span>Закрытые данные</span><h2>Себестоимость техники</h2></div></div>{catalog.map(item=>{const cost=data.costs.find(c=>c.slug===item.slug);return <CostRow key={item.slug} tractor={item} cost={cost} action={action}/>})}</div>;
}
function CostRow({tractor,cost,action}:{tractor:Tractor;cost:Cost|undefined;action:(p:Record<string,unknown>)=>Promise<unknown>}){const [value,setValue]=useState(cost?Math.round(cost.cost_minor/100):0);return <div><span><strong>{tractor.model}</strong><small>{tractor.price?new Intl.NumberFormat("ru-RU").format(tractor.price)+" сом":"Цена не задана"}</small></span><input type="number" min="0" value={value} onChange={e=>setValue(Number(e.target.value))}/><button type="button" onClick={()=>void action({action:"save_cost",slug:tractor.slug,cost:value,version:cost?.version??0})}>Сохранить</button></div>}
const auditLabels:Record<string,string>={create_deal:"Создана сделка",update_deal:"Обновлена сделка",add_note:"Добавлена заметка",create_task:"Создана задача",toggle_task:"Изменён статус задачи",save_cost:"Обновлена себестоимость",staff_active:"Изменён доступ сотрудника",staff_delete:"Удалён доступ сотрудника",invite_manager:"Создано приглашение",manager_joined:"Сотрудник принял приглашение",save_preferences:"Обновлён профиль",update_customer:"Обновлена карточка клиента"};
function AuditLog({rows}:{rows:Audit[]}){return <div className="admin-panel crm-audit"><div className="panel-head"><div><span>Безопасность</span><h2>Журнал действий</h2></div></div>{rows.map(row=><article key={row.id}><time>{new Date(row.created_at).toLocaleString("ru-RU")}</time><strong>{row.display_name||"Система"}</strong><span>{auditLabels[row.action]??row.action.replaceAll("_"," ")}</span><p>{row.detail||`Объект ${row.entity_id.slice(0,8)}`}</p></article>)}{!rows.length?<Empty title="Событий пока нет" text="Изменения сотрудников будут записываться здесь."/>:null}</div>}
function Empty({title,text}:{title:string;text:string}){return <div className="crm-empty"><ShieldCheck/><h3>{title}</h3><p>{text}</p></div>}
