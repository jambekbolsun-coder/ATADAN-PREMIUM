"use client";

import { Check, ChevronLeft, ChevronRight, Clipboard, Clock3, GripVertical, Plus, RefreshCw, Settings2, ShieldCheck, Trash2, UserRoundPlus } from "lucide-react";
import Image from "next/image";
import QRCode from "qrcode";
import { type DragEvent, FormEvent, useCallback, useEffect, useState } from "react";
import type { Tractor } from "../types";

export type CrmMode = "deals" | "customers" | "tasks" | "team" | "costs" | "audit";
type Actor = { id:string; email:string; display_name:string; role:"owner"|"director"|"manager"|"accountant"|"marketer"; theme:string; phone:string; avatar:string|null;permissions:string[] };
type Deal = { id:string; title:string; tractor_slug:string|null; stage:string; amount_minor:number; cost_minor?:number|null; assigned_to:string|null; loss_reason:string; version:number; name:string; phone:string; updated_at:string };
type Customer = { id:string; name:string; phone:string; email:string; notes:string;region:string;source:string;tractor_slug:string|null;power:number|null;purpose:string;farm_area:string;budget_minor:number;purchase_method:string;purchase_timing:string;created_at:string;version:number };
type Task = { id:string; deal_id:string|null; customer_id:string|null; title:string; description:string;priority:"low"|"normal"|"high"|"urgent";assigned_to:string;assigned_name:string;deal_title:string|null;customer_name:string|null; due_at:string; done:number; version:number };
type Staff = { id:string; display_name:string; email:string; role:string; active:number;avatar:string|null;phone:string;position:string;department:string;skills:string;bio:string;permissions_json:string };
type Cost = { slug:string; cost_minor:number; version:number };
type Audit = { id:string; action:string; entity_id:string; detail:string; created_at:string; display_name:string|null };
type Note = { id:string; deal_id:string; body:string; created_at:string; display_name:string };
type StageOption=[string,string];
type CrmData = { actor:Actor; deals:Deal[]; customers:Customer[]; tasks:Task[]; staff:Staff[]; costs:Cost[]; audit:Audit[]; notes:Note[]; stages:StageOption[] };
const money=(minor:number)=>new Intl.NumberFormat("ru-RU").format(Math.round(minor/100))+" сом";

export function AdminCRM({mode,catalog,onSessionChange}:{mode:CrmMode;catalog:Tractor[];onSessionChange?:(actor:Actor)=>void}) {
  const [data,setData]=useState<CrmData|null>(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const load=useCallback(async()=>{
    const response=await fetch(`/api/admin/crm?mode=${mode}`,{cache:"no-store"});
    const body=await response.json() as CrmData&{error?:string};
    if(!response.ok) throw new Error(body.error||"Не удалось загрузить CRM");
    setData(body); onSessionChange?.(body.actor);
  },[mode,onSessionChange]);
  useEffect(()=>{
    let cancelled=false;
    fetch(`/api/admin/crm?mode=${mode}`,{cache:"no-store"}).then(async response=>{
      const body=await response.json() as CrmData&{error?:string};
      if(!response.ok)throw new Error(body.error||"Не удалось загрузить CRM");
      if(!cancelled){setData(body);onSessionChange?.(body.actor);}
    }).catch(cause=>{if(!cancelled)setError(cause instanceof Error?cause.message:"Ошибка загрузки");});
    return()=>{cancelled=true;};
  },[mode,onSessionChange]);
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
  const [settingsOpen,setSettingsOpen]=useState(false);
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
    <section className="crm-pipeline" aria-label="Воронка сделок"><header><div><span>Воронка продаж</span><h2>Перетаскивайте сделки между этапами</h2></div><div className="pipeline-actions"><p><GripVertical/>Можно мышкой или кнопками</p>{["owner","director"].includes(data.actor.role)?<button type="button" onClick={()=>setSettingsOpen(value=>!value)}><Settings2/>Настроить этапы</button>:null}</div></header>{settingsOpen?<StageSettings stages={data.stages} close={()=>setSettingsOpen(false)} action={action}/>:null}<div className="crm-kanban">{data.stages.map(([id,label])=>{const deals=data.deals.filter(deal=>deal.stage===id);return <section className={`crm-kanban-column stage-${id}${dragOver===id?" drag-over":""}`} key={id} onDragEnter={()=>setDragOver(id)} onDragOver={event=>event.preventDefault()} onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setDragOver(null)}} onDrop={event=>drop(event,id)}><header><span>{label}</span><b>{deals.length}</b></header><div>{deals.map(deal=><DealCard key={deal.id} deal={deal} data={data} stages={data.stages} action={action} move={target=>void moveDeal(deal,target)}/>)}</div>{!deals.length?<p className="crm-kanban-empty">Перетащите сделку сюда</p>:null}</section>})}</div></section>
  </>;
}

function StageSettings({stages,close,action}:{stages:StageOption[];close:()=>void;action:(payload:Record<string,unknown>)=>Promise<unknown>}){const [items,setItems]=useState<StageOption[]>(stages.map(item=>[...item]));const locked=new Set(["new","won","lost"]);function add(){if(items.length>=12)return;setItems(current=>[...current,[`stage_${Date.now()}`,"Новый этап"]])}async function save(){await action({action:"save_stages",stages:items.map(([id,label])=>({id,label}))});close()}return <div className="pipeline-settings"><header><div><strong>Этапы воронки</strong><small>До 12 этапов. Системные этапы сохраняют автоматизацию продаж.</small></div><button type="button" onClick={add} disabled={items.length>=12}><Plus/>Добавить</button></header><div>{items.map(([id,label],index)=><label key={id}><span>{index+1}</span><input value={label} maxLength={60} onChange={event=>setItems(current=>current.map((item,itemIndex)=>itemIndex===index?[item[0],event.target.value]:item))}/><button type="button" disabled={locked.has(id)} onClick={()=>setItems(current=>current.filter(item=>item[0]!==id))} aria-label={`Удалить этап ${label}`}><Trash2/></button></label>)}</div><footer><button type="button" onClick={close}>Отмена</button><button className="admin-primary" type="button" onClick={()=>void save()}><Check/>Сохранить этапы</button></footer></div>}

function DealCard({deal,data,stages,action,move}:{deal:Deal;data:CrmData;stages:StageOption[];action:(p:Record<string,unknown>)=>Promise<unknown>;move:(stage:string)=>void}){
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
  async function create(event:FormEvent<HTMLFormElement>){event.preventDefault();const f=new FormData(event.currentTarget);await action({action:"create_task",title:f.get("title"),description:f.get("description"),priority:f.get("priority"),dueAt:f.get("dueAt"),dealId:f.get("dealId"),customerId:f.get("customerId"),assignedTo:f.get("assignedTo")});event.currentTarget.reset();}
  const priorityLabel={low:"Низкая",normal:"Обычная",high:"Высокая",urgent:"Срочно"};
  return <><form className="admin-panel crm-task-create crm-task-create-detailed" onSubmit={create}><div><span>План работы</span><h2>Новая задача</h2><p>Назначьте сотрудника, срок, срочность и при необходимости привяжите клиента или сделку.</p></div><label><span>Название</span><input name="title" required placeholder="Позвонить клиенту"/></label><label><span>Крайний срок</span><input name="dueAt" type="datetime-local" required/></label><label><span>Срочность</span><select name="priority" defaultValue="normal"><option value="low">Низкая</option><option value="normal">Обычная</option><option value="high">Высокая</option><option value="urgent">Срочно</option></select></label><label><span>Клиент</span><select name="customerId"><option value="">Без клиента</option>{data.customers.map(c=><option value={c.id} key={c.id}>{c.name} · {c.phone}</option>)}</select></label><label><span>Сделка</span><select name="dealId"><option value="">Без сделки</option>{data.deals.map(d=><option value={d.id} key={d.id}>{d.title}</option>)}</select></label>{["owner","director"].includes(data.actor.role)?<label><span>Ответственный</span><select name="assignedTo" defaultValue={data.actor.id}>{data.staff.filter(s=>s.active).map(s=><option value={s.id} key={s.id}>{s.display_name}</option>)}</select></label>:null}<label className="full"><span>Описание</span><textarea name="description" rows={3} placeholder="Что нужно сделать и какой результат ожидается"/></label><button className="admin-primary" type="submit">Добавить задачу</button></form><div className="admin-panel crm-task-list crm-task-list-detailed">{data.tasks.map(task=><label key={task.id} className={`${task.done?"done":""} priority-${task.priority}`}><input aria-label={task.done?`Вернуть задачу «${task.title}»`:`Завершить задачу «${task.title}»`} type="checkbox" checked={Boolean(task.done)} onChange={()=>void action({action:"toggle_task",id:task.id,done:!task.done,version:task.version})}/><span><span className="task-meta"><b>{priorityLabel[task.priority]}</b><small>{task.assigned_name}</small></span><strong>{task.title}</strong>{task.description?<p>{task.description}</p>:null}<small><Clock3 size={13}/>{new Date(task.due_at).toLocaleString("ru-RU")}{task.customer_name?` · ${task.customer_name}`:""}{task.deal_title?` · ${task.deal_title}`:""}</small></span></label>)}{!data.tasks.length?<Empty title="Задач пока нет" text="Добавьте задачу для себя или сотрудника."/>:null}</div></>;
}

function Team({data,action}:{data:CrmData;action:(p:Record<string,unknown>)=>Promise<unknown>}){
  const [invite,setInvite]=useState("");
  const [role,setRole]=useState("manager");
  const [permissions,setPermissions]=useState<string[]>(defaultRolePermissions.manager);
  const [url,setUrl]=useState("");
  const [qr,setQr]=useState("");
  const [inviteError,setInviteError]=useState("");
  useEffect(()=>{if(url)QRCode.toDataURL(url,{width:260,margin:2,color:{dark:"#092f1d",light:"#ffffff"}}).then(setQr).catch(()=>setQr(""));},[url]);
  async function createInvite(event:FormEvent<HTMLFormElement>){event.preventDefault();setInviteError("");try{const response=await fetch("/api/admin/invites",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:invite,role,permissions})});const body=await response.json() as {url?:string;error?:string};if(!response.ok)throw new Error(body.error);setUrl(body.url||"");}catch(cause){setInviteError(cause instanceof Error?cause.message:"Не удалось создать приглашение");}}
  if(!["owner","director"].includes(data.actor.role))return <Empty title="Команда доступна директору" text="Ваши данные и задачи остаются доступны в личном кабинете."/>;
  const roleLabel=(value:string)=>({owner:"Владелец",director:"Директор",manager:"Менеджер",accountant:"Бухгалтер",marketer:"Маркетолог"} as Record<string,string>)[value]??value;
  return <><form className="admin-panel crm-invite" onSubmit={(e)=>void createInvite(e)}><div><span>Одноразовая ссылка и QR-код</span><h2>Пригласить сотрудника</h2><p>Ссылка действует 24 часа. Сотрудник сам задаст имя и пароль.</p></div><input type="email" value={invite} onChange={e=>setInvite(e.target.value)} required placeholder="employee@example.com"/><select value={role} onChange={event=>{const next=event.target.value;setRole(next);setPermissions(defaultRolePermissions[next]??[])}} aria-label="Роль сотрудника"><option value="manager">Менеджер</option><option value="accountant">Бухгалтер</option><option value="marketer">Маркетолог</option></select><PermissionPicker value={permissions} onChange={setPermissions}/>{inviteError?<p className="crm-message error" role="alert">{inviteError}</p>:null}<button className="admin-primary" type="submit"><UserRoundPlus size={17}/>Создать приглашение</button>{url?<div className="invite-result">{qr?<Image src={qr} alt="QR-код приглашения сотрудника" width={150} height={150} unoptimized/>:null}<code>{url}</code><button type="button" onClick={()=>void navigator.clipboard.writeText(url)}><Clipboard size={16}/>Копировать</button></div>:null}</form><div className="admin-panel crm-team">{data.staff.map(person=><StaffCard key={person.id} person={person} roleLabel={roleLabel} action={action}/>)}</div></>;
}

const permissionChoices=[...["deals","client-base","inventory-units","sales","leasing-applications","employee-tasks"].map((id,index)=>({id,label:["Воронка продаж","Клиенты","Склад","Продажи","Заявки на лизинг","Задачи"][index]})),...["catalog","parts","news","public-service","faq","leasing","leasing-models","promotions","site-leads","site-analytics"].map((id,index)=>({id,label:["Каталог","Запчасти","Новости","Сервис","FAQ чатбота","Условия лизинга","Условия моделей","Акции","Заявки сайта","Аналитика сайта"][index]})),...["suppliers","expenses","finance","payroll","payments","debts"].map((id,index)=>({id,label:["Поставщики","Расходы","Финансы","Зарплаты","Платежи","Задолженности"][index]})),...["notifications","chat","groups"].map((id,index)=>({id,label:["Уведомления","Чат","Группы"][index]}))];
const defaultRolePermissions:Record<string,string[]>={manager:["deals","client-base","inventory-units","sales","payments","employee-tasks","notifications","chat","groups","leasing-applications"],accountant:["suppliers","expenses","finance","payroll","payments","debts","employee-tasks","notifications","chat","groups"],marketer:["catalog","parts","news","public-service","faq","leasing","leasing-models","promotions","site-leads","site-analytics","employee-tasks","notifications","chat","groups"]};
function PermissionPicker({value,onChange}:{value:string[];onChange:(value:string[])=>void}){return <fieldset className="permission-picker"><legend>Доступ к разделам</legend>{permissionChoices.map(item=><label key={item.id}><input type="checkbox" checked={value.includes(item.id)} onChange={event=>onChange(event.target.checked?[...value,item.id]:value.filter(id=>id!==item.id))}/><span>{item.label}</span></label>)}</fieldset>}
function StaffCard({person,roleLabel,action}:{person:Staff;roleLabel:(value:string)=>string;action:(p:Record<string,unknown>)=>Promise<unknown>}){let initial:string[]|null=null;try{const parsed=JSON.parse(person.permissions_json) as unknown;if(Array.isArray(parsed))initial=parsed.filter((value):value is string=>typeof value==="string")}catch{initial=null}initial??=defaultRolePermissions[person.role]??[];const [permissions,setPermissions]=useState(initial);const protectedRole=["owner","director"].includes(person.role);return <article className="staff-card"><i><ShieldCheck/></i><div className="staff-card-main"><strong>{person.display_name}</strong><span>{person.email}</span><small>{[roleLabel(person.role),person.position,person.department].filter(Boolean).join(" · ")}</small>{person.skills?<p>Навыки: {person.skills}</p>:null}{person.bio?<p>{person.bio}</p>:null}</div>{protectedRole?<b>{roleLabel(person.role)}</b>:<details className="staff-access"><summary>Доступ и действия</summary><PermissionPicker value={permissions} onChange={setPermissions}/><div className="team-actions"><button type="button" onClick={()=>void action({action:"staff_permissions",id:person.id,permissions})}>Сохранить доступ</button><button className={person.active?"danger":""} type="button" onClick={()=>void action({action:"staff_active",id:person.id,active:!person.active})}>{person.active?"Заблокировать":"Разблокировать"}</button><button className="danger" type="button" onClick={()=>confirm(`Удалить доступ ${person.display_name}? История сделок сохранится.`)&&void action({action:"staff_delete",id:person.id})}>Удалить</button></div></details>}</article>}

function Costs({data,catalog,action}:{data:CrmData;catalog:Tractor[];action:(p:Record<string,unknown>)=>Promise<unknown>}){
  if(!["owner","director"].includes(data.actor.role))return <Empty title="Финансы доступны директору" text="Закупочные цены скрыты от менеджеров."/>;
  return <div className="admin-panel crm-costs"><div className="panel-head"><div><span>Закрытые данные</span><h2>Себестоимость техники</h2></div></div>{catalog.map(item=>{const cost=data.costs.find(c=>c.slug===item.slug);return <CostRow key={item.slug} tractor={item} cost={cost} action={action}/>})}</div>;
}
function CostRow({tractor,cost,action}:{tractor:Tractor;cost:Cost|undefined;action:(p:Record<string,unknown>)=>Promise<unknown>}){const [value,setValue]=useState(cost?Math.round(cost.cost_minor/100):0);return <div><span><strong>{tractor.model}</strong><small>{tractor.price?new Intl.NumberFormat("ru-RU").format(tractor.price)+" сом":"Цена не задана"}</small></span><input type="number" min="0" value={value} onChange={e=>setValue(Number(e.target.value))}/><button type="button" onClick={()=>void action({action:"save_cost",slug:tractor.slug,cost:value,version:cost?.version??0})}>Сохранить</button></div>}
const auditLabels:Record<string,string>={create_deal:"Создана сделка",update_deal:"Обновлена сделка",add_note:"Добавлена заметка",create_task:"Создана задача",toggle_task:"Изменён статус задачи",save_cost:"Обновлена себестоимость",staff_active:"Изменён доступ сотрудника",staff_delete:"Удалён доступ сотрудника",invite_manager:"Создано приглашение",manager_joined:"Сотрудник принял приглашение",save_preferences:"Обновлён профиль",update_customer:"Обновлена карточка клиента"};
function AuditLog({rows}:{rows:Audit[]}){return <div className="admin-panel crm-audit"><div className="panel-head"><div><span>Безопасность</span><h2>Журнал действий</h2></div></div>{rows.map(row=><article key={row.id}><time>{new Date(row.created_at).toLocaleString("ru-RU")}</time><strong>{row.display_name||"Система"}</strong><span>{auditLabels[row.action]??row.action.replaceAll("_"," ")}</span><p>{row.detail||`Объект ${row.entity_id.slice(0,8)}`}</p></article>)}{!rows.length?<Empty title="Событий пока нет" text="Изменения сотрудников будут записываться здесь."/>:null}</div>}
function Empty({title,text}:{title:string;text:string}){return <div className="crm-empty"><ShieldCheck/><h3>{title}</h3><p>{text}</p></div>}
