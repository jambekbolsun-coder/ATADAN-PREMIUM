"use client";

import { MessageSquareText, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LeadForm } from "./LeadForm";
import { useI18n } from "./I18n";

const labels={ru:{button:"Оставить заявку",title:"Расскажите, что нужно",text:"Укажите имя, телефон и задачу. Заявка сохранится в ATADAN CRM, затем откроется WhatsApp."},ky:{button:"Өтүнмө калтыруу",title:"Эмне керек экенин айтыңыз",text:"Атыңызды, телефонуңузду жана тапшырманы жазыңыз. Өтүнмө CRMде сакталат, андан кийин WhatsApp ачылат."},en:{button:"Send a request",title:"Tell us what you need",text:"Add your name, phone and task. The request is saved in ATADAN CRM and then WhatsApp opens."}} as const;

export function LeadModalButton(){
  const {locale}=useI18n();const l=labels[locale];const [open,setOpen]=useState(false);const dialog=useRef<HTMLElement>(null);const trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(!open)return;const old=document.body.style.overflow;const previousTrigger=trigger.current;document.body.style.overflow="hidden";window.setTimeout(()=>dialog.current?.querySelector<HTMLElement>('input[name="name"]')?.focus(),0);function keydown(event:KeyboardEvent){if(event.key==="Escape"){setOpen(false);return}if(event.key!=="Tab"||!dialog.current)return;const controls=Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]):not([tabindex="-1"]),textarea:not([disabled])'));const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}document.addEventListener("keydown",keydown);return()=>{document.removeEventListener("keydown",keydown);document.body.style.overflow=old;previousTrigger?.focus()}},[open]);
  function show(){window.dispatchEvent(new Event("atadan:dialog-open"));setOpen(true)}
  return <><button ref={trigger} className="service-request-button" type="button" onClick={show}><MessageSquareText aria-hidden="true"/>{l.button}</button>{open?<div className="lead-modal"><button className="lead-modal-backdrop" type="button" tabIndex={-1} aria-label="Закрыть" onClick={()=>setOpen(false)}/><section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="lead-modal-title"><button className="lead-modal-close" type="button" aria-label="Закрыть" onClick={()=>setOpen(false)}><X aria-hidden="true"/></button><span><MessageSquareText aria-hidden="true"/>ATADAN · CHANGFA</span><h2 id="lead-modal-title">{l.title}</h2><p>{l.text}</p><LeadForm defaultMessage={locale==="ru"?"Нужна консультация по сервису":locale==="ky"?"Сервис боюнча консультация керек":"I need a service consultation"}/></section></div>:null}</>;
}
