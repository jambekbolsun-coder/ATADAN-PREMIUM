"use client";
import { useEffect,useRef,useState } from "react";
import type { Tractor } from "../types";
import { useI18n } from "./I18n";
const videos=[
"2a5bca8000fc346c127585f15e32417a","4bbeb055bd56a1d867f23ba96fb924ca","189f6bf017e65762d394a7c9d34694dd","de0bd8a99c155ff3219862089d5d903e","57c09e9c4764a106a7de58d5719b472f","49c29d1e5ea03e4d55a933ec01bd2d98","406ff714dd6fd7073b1a6256d3fcaed1","6c2c5d340805d7f4e591c038f0d7eac3","097b22d603400bf6998baec7794173f1","587cb7fc5f159c66d945846aa52399f7"];
const models=["CFG1600","CFG1600-H","CFG1604-A","CFH1604-M","CFH1804-M","CFJ1804(G4)","CFJ2004(G4)","CFJ2204(G4)","CFK2304(G4)","CFK2404(G4)"];
export function ProductVideo({tractor}:{tractor:Tractor}){
 const [desktop,setDesktop]=useState(false),[failed,setFailed]=useState(false);const ref=useRef<HTMLVideoElement>(null),{locale}=useI18n();
 const index=models.indexOf(tractor.model),url=tractor.videoUrl||(index>=0?`https://en.changfanz.com/uploads/20260515/${videos[index]}.mp4`:null);
 useEffect(()=>{const mq=matchMedia("(min-width: 1024px)");const update=()=>setDesktop(mq.matches);update();mq.addEventListener("change",update);return()=>mq.removeEventListener("change",update);},[]);
 useEffect(()=>{
   const v=ref.current;if(!v)return;
   const observer=new IntersectionObserver(([entry])=>{if(!entry.isIntersecting||document.hidden)v.pause();},{threshold:.05});observer.observe(v);
   const pause=()=>{if(document.hidden)v.pause();};document.addEventListener("visibilitychange",pause);
   return()=>{observer.disconnect();document.removeEventListener("visibilitychange",pause);};
 },[desktop,url]);
 if(!desktop||!url||tractor.hp<160||tractor.hp>240)return null;
 const title={ru:"Технологии Changfa в деталях",ky:"Changfa технологиялары",en:"Changfa technology up close"}[locale];
 const note={ru:"Официальный обзор серии J-5th PRO: кабина, управление и внешний вид. Это демонстрация технологий производителя; оснащение выбранной модели уточняйте у менеджера.",ky:"J-5th PRO сериясынын расмий обзору: кабина, башкаруу жана сырткы көрүнүш. Тандалган моделдин комплектациясын менеджерден тактаңыз.",en:"Official J-5th PRO series overview: cabin, controls and exterior. This illustrates manufacturer technologies; confirm your model’s equipment with a manager."}[locale];
 return <section className="product-video section-shell"><span className="section-label">CHANGFA</span><h2>{title}</h2>{failed?<a className="text-link" href="https://en.changfanz.com/archives/Tractor/15.html" target="_blank" rel="noreferrer">{title} ↗</a>:<video ref={ref} src={url} controls muted playsInline preload="none" onError={()=>setFailed(true)} aria-label={title}/>}<p>{tractor.videoUrl?title:note}</p></section>;
}
