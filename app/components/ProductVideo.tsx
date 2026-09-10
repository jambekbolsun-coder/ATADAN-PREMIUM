"use client";
import { Pause, Play } from "lucide-react";
import { useEffect,useRef,useState } from "react";
import type { Tractor } from "../types";
import { useI18n } from "./I18n";
const models=["CFG1600","CFG1600-H","CFG1604-A","CFH1604-M","CFH1804-M","CFJ1804(G4)","CFJ2004(G4)","CFJ2204(G4)","CFK2304(G4)","CFK2404(G4)"];
const slugs=["cfg1600","cfg1600-h","cfg1604-a","cfh1604-m","cfh1804-m","cfj1804-g4","cfj2004-g4","cfj2204-g4","cfk2304-g4","cfk2404-g4"];
export function ProductVideo({tractor}:{tractor:Tractor}){
 const [failed,setFailed]=useState(false),[pausedByUser,setPausedByUser]=useState(false),[visible,setVisible]=useState(false);const ref=useRef<HTMLVideoElement>(null),visibleRef=useRef(false),{locale}=useI18n();
 const index=models.indexOf(tractor.model),url=tractor.videoUrl||(index>=0?`/videos/${slugs[index]}-10s.mp4`:null);
 useEffect(()=>{
   const v=ref.current;if(!v)return;
   const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
   const sync=()=>{if(visibleRef.current&&!document.hidden&&!pausedByUser&&!reduced){void v.play().catch(()=>undefined)}else v.pause()};
   const observer=new IntersectionObserver(([entry])=>{const inView=entry.isIntersecting&&entry.intersectionRatio>=.45;visibleRef.current=inView;setVisible(inView);sync();},{threshold:[0,.45,.8]});observer.observe(v);
   document.addEventListener("visibilitychange",sync);
   return()=>{observer.disconnect();document.removeEventListener("visibilitychange",sync);v.pause();};
 },[pausedByUser,url]);
 if(!url||tractor.hp<160||tractor.hp>240)return null;
 const title={ru:"Технологии Changfa в деталях",ky:"Changfa технологиялары",en:"Changfa technology up close"}[locale];
 const note={ru:"10 секунд официальной динамики модели: ролик включается, когда попадает в поле зрения, и сразу ставится на паузу вне экрана.",ky:"Моделдин 10 секунддук расмий видеосу: экранда көрүнгөндө иштеп, экрандан чыкканда токтойт.",en:"A 10-second official model view that plays only while it is on screen and pauses when you scroll away."}[locale];
 const pauseLabel={ru:pausedByUser?"Продолжить видео":"Поставить видео на паузу",ky:pausedByUser?"Видеону улантуу":"Видеону токтотуу",en:pausedByUser?"Resume video":"Pause video"}[locale];
 function toggle(){const v=ref.current;if(!v)return;setPausedByUser(value=>{const next=!value;if(next)v.pause();else if(visible&&!document.hidden)void v.play().catch(()=>undefined);return next;});}
 return <section className="product-video section-shell"><header><span className="section-label">CHANGFA · 10 SEC</span><h2>{title}</h2><p>{note}</p></header>{failed?<a className="text-link product-video-error" href="https://en.changfanz.com/archives/Tractor/15.html" target="_blank" rel="noreferrer">{title} ↗</a>:<div className="product-video-stage"><video ref={ref} src={url} poster={tractor.image} muted loop playsInline preload="metadata" onError={()=>setFailed(true)} aria-label={title}/><span className="product-video-model">Changfa <strong>{tractor.model}</strong></span><button type="button" onClick={toggle} aria-label={pauseLabel}>{pausedByUser?<Play aria-hidden="true"/>:<Pause aria-hidden="true"/>}<span>{pauseLabel}</span></button></div>}</section>;
}
