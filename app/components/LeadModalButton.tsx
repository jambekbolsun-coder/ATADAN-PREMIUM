"use client";

import { createPortal } from "react-dom";
import { MessageSquareText, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { LeadForm } from "./LeadForm";
import { useI18n } from "./I18n";

const labels={ru:{button:"Оставить заявку",title:"Расскажите, что нужно",text:"Менеджер в скором времени свяжется с вами"},ky:{button:"Өтүнмө калтыруу",title:"Эмне керек экенин айтыңыз",text:"Менеджер жакында сиз менен байланышат."},en:{button:"Send a request",title:"Tell us what you need",text:"A manager will contact you shortly."}} as const;

export function LeadModalButton({tractorSlug,tractorModel}:{tractorSlug?:string;tractorModel?:string}={}){
  const titleId=useId();
  const {locale}=useI18n();const l=labels[locale];const [open,setOpen]=useState(false);const dialog=useRef<HTMLElement>(null);const trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(!open)return;const old=document.body.style.overflow;const previousTrigger=trigger.current;document.body.style.overflow="hidden";window.setTimeout(()=>dialog.current?.querySelector<HTMLElement>('input[name="name"]')?.focus(),0);function keydown(event:KeyboardEvent){if(event.key==="Escape"){setOpen(false);return}if(event.key!=="Tab"||!dialog.current)return;const controls=Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]):not([tabindex="-1"]),textarea:not([disabled]),select:not([disabled])'));const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}document.addEventListener("keydown",keydown);return()=>{document.removeEventListener("keydown",keydown);document.body.style.overflow=old;previousTrigger?.focus()}},[open]);
  function show(){window.dispatchEvent(new Event("atadan:dialog-open"));setOpen(true)}
  return <><button ref={trigger} className="service-request-button" type="button" onClick={show}><MessageSquareText aria-hidden="true"/>{l.button}</button>{open?createPortal(<div className="lead-modal"><button className="lead-modal-backdrop" type="button" tabIndex={-1} aria-label="Закрыть" onClick={()=>setOpen(false)}/><section ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}><button className="lead-modal-close" type="button" aria-label="Закрыть" onClick={()=>setOpen(false)}><X aria-hidden="true"/></button><span><MessageSquareText aria-hidden="true"/>ATADAN · CHANGFA</span><h2 id={titleId}>{tractorModel ? `Changfa ${tractorModel}` : l.title}</h2><p>{l.text}</p><LeadForm tractorSlug={tractorSlug} tractorModel={tractorModel} defaultMessage={tractorModel ? `Интересует Changfa ${tractorModel}` : locale==="ru"?"Нужна консультация по сервису":locale==="ky"?"Сервис боюнча консультация керек":"I need a service consultation"}/></section></div>,document.body):null}</>;
}
