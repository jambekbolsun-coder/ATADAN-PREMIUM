"use client";

import { Bot, CheckCircle2, ChevronRight, MessageCircle, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "./SiteLink";
import { useI18n } from "./I18n";
import { useSiteSettings } from "./SiteSettings";
import { Instagram, WhatsApp } from "./BrandIcons";
import { PRIVACY_CHOICE_EVENT, PRIVACY_CHOICE_KEY } from "./CookieConsent";

const ui={
  ru:{title:"Подберём трактор за минуту",text:"Три коротких вопроса — и покажем подходящую мощность.",start:"Начать подбор",later:"Не сейчас",area:"Какая площадь хозяйства?",work:"Какие работы главные?",priority:"Что важнее всего?",back:"Назад",result:"Подходящий диапазон",show:"Показать модели",faq:"Помощник ATADAN",faqText:"Короткие ответы перед разговором с менеджером.",q:["Есть гарантия?","Можно оформить лизинг?","Есть сервис и запчасти?"],a:["Да, условия гарантии фиксируются для выбранной модели и комплектации.","Да. Калькулятор показывает предварительный график до 84 месяцев, финальные условия подтверждает финансовый партнёр.","Да. ATADAN помогает с обслуживанием техники и подбором запасных частей."],ask:"Написать менеджеру"},
  ky:{title:"Тракторду бир мүнөттө тандайбыз",text:"Үч кыска суроо — ылайыктуу кубаттуулукту көрсөтөбүз.",start:"Тандоону баштоо",later:"Азыр эмес",area:"Чарбанын аянты канча?",work:"Негизги жумуш кайсы?",priority:"Эмнеси маанилүү?",back:"Артка",result:"Ылайыктуу диапазон",show:"Моделдерди көрүү",faq:"ATADAN жардамчысы",faqText:"Менеджерге чейин кыска жооптор.",q:["Кепилдик барбы?","Лизинг барбы?","Сервис жана тетиктер барбы?"],a:["Ооба, кепилдик шарттары тандалган модель жана комплектация үчүн бекитилет.","Ооба. Калькулятор 84 айга чейинки болжолдуу графикти көрсөтөт, акыркы шарттарды каржы өнөктөшү бекитет.","Ооба. ATADAN тейлөөгө жана запастык бөлүктөрдү тандоого жардам берет."],ask:"Менеджерге жазуу"},
  en:{title:"Find your tractor in a minute",text:"Answer three short questions and see a suitable power range.",start:"Start selection",later:"Not now",area:"How large is the farm?",work:"What is the main job?",priority:"What matters most?",back:"Back",result:"Suggested power range",show:"View models",faq:"ATADAN assistant",faqText:"Quick answers before you speak with a manager.",q:["Is there a warranty?","Is leasing available?","Do you provide service and parts?"],a:["Yes. Warranty terms are confirmed for the selected model and configuration.","Yes. The calculator shows a preliminary schedule up to 84 months; final terms come from the finance partner.","Yes. ATADAN helps with machinery service and parts selection."],ask:"Message a manager"}
} as const;
const options={
  area:[["До 30 га","30"],["30–100 га","70"],["100–300 га","140"],["Более 300 га","220"]],
  work:[["Универсальные работы","0"],["Посев и культивация","10"],["Тяжёлая обработка","30"]],
  priority:[["Манёвренность","-10"],["Баланс","0"],["Запас мощности","20"]],
} as const;
const optionLabels={
  ru:{area:["До 30 га","30–100 га","100–300 га","Более 300 га"],work:["Универсальные работы","Посев и культивация","Тяжёлая обработка"],priority:["Манёвренность","Баланс","Запас мощности"]},
  ky:{area:["30 гектарга чейин","30–100 гектар","100–300 гектар","300 гектардан көп"],work:["Ар түрдүү жумуштар","Себүү жана культивация","Оор жер иштетүү"],priority:["Маневрдүүлүк","Тең салмак","Кубат запасы"]},
  en:{area:["Up to 30 ha","30–100 ha","100–300 ha","Over 300 ha"],work:["General farm work","Seeding and cultivation","Heavy tillage"],priority:["Maneuverability","Balance","Power reserve"]},
} as const;

export type SiteFaq={id:string;question:string;answer:string;buttonLabel?:string;buttonUrl?:string};
export function SiteAssist({faqs=[]}:{faqs?:SiteFaq[]}){
  const {locale}=useI18n(),l=ui[locale],settings=useSiteSettings();
  const [quiz,setQuiz]=useState(false),[assistant,setAssistant]=useState(false),[step,setStep]=useState(0);
  const quizRef=useRef<HTMLElement>(null);
  const [answers,setAnswers]=useState([70,0,0]);
  const [faq,setFaq]=useState<number|null>(null);
  useEffect(()=>{
    let timer:number|undefined;
    const schedule=()=>{if(!window.localStorage.getItem(PRIVACY_CHOICE_KEY)||window.sessionStorage.getItem("atadan-quiz-seen"))return;window.clearTimeout(timer);timer=window.setTimeout(()=>{if(!document.querySelector('[aria-modal="true"]'))setQuiz(true)},7000)};
    const dismiss=()=>{window.clearTimeout(timer);window.sessionStorage.setItem("atadan-quiz-seen","1");setQuiz(false)};
    schedule();window.addEventListener(PRIVACY_CHOICE_EVENT,schedule);window.addEventListener("atadan:dialog-open",dismiss);
    return()=>{window.clearTimeout(timer);window.removeEventListener(PRIVACY_CHOICE_EVENT,schedule);window.removeEventListener("atadan:dialog-open",dismiss)};
  },[]);
  useEffect(()=>{
    if(!quiz)return;
    const dialog=quizRef.current,previous=document.activeElement instanceof HTMLElement?document.activeElement:null,overflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    window.setTimeout(()=>dialog?.querySelector<HTMLElement>("button,a")?.focus(),0);
    function keydown(event:KeyboardEvent){
      if(event.key==="Escape"){event.preventDefault();closeQuiz();return;}
      if(event.key!=="Tab"||!dialog)return;
      const controls=Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]'));
      const first=controls[0],last=controls.at(-1);if(!first||!last)return;
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
    document.addEventListener("keydown",keydown);
    return()=>{document.removeEventListener("keydown",keydown);document.body.style.overflow=overflow;previous?.focus();};
  },[quiz]);
  function closeQuiz(){sessionStorage.setItem("atadan-quiz-seen","1");setQuiz(false);}
  const power=useMemo(()=>Math.max(50,Math.min(240,answers.reduce((a,b)=>a+b,0))),[answers]);
  const range=power<=60?"50–80":power<=105?"90–120":power<=165?"140–180":"200–240";
  const catalogPower=range==="50–80"?50:range==="90–120"?90:range==="140–180"?140:200;
  const whatsapp="https://wa.me/"+settings.phone.replace(/\D/g,"");
  const group=step===1?"area":step===2?"work":"priority";
  const questions:SiteFaq[]=faqs.length?faqs:l.q.map((question,index)=>({id:`default-${index}`,question,answer:l.a[index]}));
  return <>
    <div className="site-assist">
      {assistant?<section className="assist-panel" id="atadan-assistant" role="dialog" aria-label={l.faq}><header><div><Bot aria-hidden="true"/><span><strong>{l.faq}</strong><small>{l.faqText}</small></span></div><button type="button" onClick={()=>setAssistant(false)} aria-label="Закрыть"><X/></button></header><div>{questions.map((item,index)=><article key={item.id}><button type="button" aria-expanded={faq===index} onClick={()=>setFaq(faq===index?null:index)}>{item.question}<ChevronRight/></button>{faq===index?<p>{item.answer}{item.buttonUrl?<a href={item.buttonUrl} target={item.buttonUrl.startsWith("http")?"_blank":undefined} rel={item.buttonUrl.startsWith("http")?"noreferrer":undefined}>{item.buttonLabel||"Подробнее"}</a>:null}</p>:null}</article>)}</div><a href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle/>{l.ask}</a></section>:null}
      <a className="assist-instagram" href={settings.instagram} target="_blank" rel="noreferrer" aria-label="Instagram ATADAN"><Instagram size={21}/></a>
      <a className="assist-whatsapp" href={whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp"><WhatsApp size={22}/></a>
      <button className="assist-bot" type="button" aria-label={l.faq} aria-expanded={assistant} aria-controls="atadan-assistant" onClick={()=>setAssistant(v=>!v)}><Bot aria-hidden="true"/></button>
    </div>
    {quiz?<div className="quiz-overlay"><button className="quiz-backdrop" tabIndex={-1} type="button" onClick={closeQuiz} aria-label={l.later}/><section ref={quizRef} className="tractor-quiz" role="dialog" aria-modal="true" aria-labelledby="quiz-title"><button className="quiz-close" type="button" onClick={closeQuiz} aria-label={l.later}><X/></button><span className="quiz-icon"><Sparkles/></span><div className="quiz-progress" aria-label={`${Math.min(step+1,4)} / 4`}><i style={{width:`${Math.min(step+1,4)*25}%`}}/></div>{step===0?<><h2 id="quiz-title">{l.title}</h2><p>{l.text}</p><button className="quiz-start" type="button" onClick={()=>setStep(1)}>{l.start}<ChevronRight/></button><button className="quiz-later" type="button" onClick={closeQuiz}>{l.later}</button></>:step<=3?<><h2 id="quiz-title">{step===1?l.area:step===2?l.work:l.priority}</h2><div className="quiz-options">{options[group].map(([,value],index)=><button type="button" key={value} onClick={()=>{const next=[...answers];next[step-1]=Number(value);setAnswers(next);setStep(step+1);}}>{optionLabels[locale][group][index]}<ChevronRight/></button>)}</div><button className="quiz-later" type="button" onClick={()=>setStep(step-1)}>{l.back}</button></>:<div className="quiz-result"><CheckCircle2/><span>{l.result}</span><strong>{range} ЛС</strong><Link href={`/catalog?power=${catalogPower}`} onClick={closeQuiz}>{l.show}<ChevronRight/></Link></div>}</section></div>:null}
  </>;
}
