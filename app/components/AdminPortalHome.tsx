"use client";

import Image from "next/image";
import { ArrowRight, BarChart3, BriefcaseBusiness, Globe2, LogOut, Megaphone, ShieldCheck, Sparkles, UserRound } from "lucide-react";

export type AdminWorkspace = "marketing" | "company" | "control";

const portals=[
  {id:"marketing",title:"Маркетинг",subtitle:"Управление сайтом и внешней информацией компании",Icon:Megaphone,accent:"coral"},
  {id:"company",title:"Управление компанией",subtitle:"CRM, продажи, склад, финансы и внутренняя работа",Icon:BriefcaseBusiness,accent:"blue"},
  {id:"control",title:"Центр управления",subtitle:"Аналитика, сигналы внимания и контроль бизнеса",Icon:BarChart3,accent:"green"},
] as const;

const roleLabels={owner:"Владелец",director:"Директор",manager:"Менеджер",accountant:"Бухгалтер",marketer:"Маркетолог"} as const;
export function AdminPortalHome({actor,onChoose,onLogout}:{actor:{display_name:string;role:keyof typeof roleLabels;avatar:string|null};onChoose:(workspace:AdminWorkspace)=>void;onLogout:()=>void}){
  return <main className="admin-portal-home">
    <div className="admin-portal-overlay" aria-hidden="true"/>
    <header className="admin-portal-header"><div className="admin-portal-brand"><Image src="/atadan-logo-cropped.png" alt="ATADAN Changfa" width={210} height={72} priority/><span>единая система управления</span></div><div className="portal-account"><span><UserRound aria-hidden="true"/></span><div><strong>{actor.display_name}</strong><small>{roleLabels[actor.role]}</small></div><button type="button" onClick={onLogout} aria-label="Выйти"><LogOut/></button></div></header>
    <section className="admin-portal-intro"><span><Sparkles aria-hidden="true"/>ATADAN CONTROL</span><h1>Добро пожаловать!</h1><p>Выберите рабочее пространство. Все разделы используют одну защищённую SQL-базу и показывают только фактические данные.</p></section>
    <section className="admin-portal-choices" aria-label="Рабочие пространства">{portals.map(({id,title,subtitle,Icon,accent})=>{
      const allowed=actor.role==="owner"||actor.role==="director"||(actor.role==="manager"&&id==="company")||(actor.role==="accountant"&&id==="company")||(actor.role==="marketer"&&id==="marketing");
      return <button type="button" className={`portal-orbit ${accent}`} key={id} disabled={!allowed} onClick={()=>allowed&&onChoose(id)}><span className="portal-orbit-ring" aria-hidden="true"/><i><Icon aria-hidden="true"/></i><strong>{title}</strong><small>{subtitle}</small>{allowed?<b>Открыть <ArrowRight aria-hidden="true"/></b>:<b><ShieldCheck aria-hidden="true"/>Доступ управляющего</b>}</button>})}</section>
    <footer className="admin-portal-footer"><span><Globe2 aria-hidden="true"/>Техника, которая двигает страну</span><small>ATADAN · CHANGFA · Кыргызстан</small></footer>
  </main>;
}
