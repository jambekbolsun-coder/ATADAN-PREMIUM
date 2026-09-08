"use client";

import { Check, Globe2, ImageIcon, Laptop, LoaderCircle, Smartphone, Tablet, UploadCloud } from "lucide-react";
import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { bannerMediaKey, type BannerViewport, type SiteSettings } from "../lib/site-settings-types";

const bannerGroups = [
  { label:"Главная · первый экран", image:"/images/hero/atadan-field-wide.png", mobile:"/images/hero/atadan-field-mobile.png" },
  { label:"Главная · комфорт", image:"/images/hero/changfa-highway-4k.webp" },
  { label:"Главная · модельный ряд", image:"/images/hero/changfa-lineup-4k.webp" },
  { label:"Каталог", image:"/images/banners/catalog.webp" },
  { label:"Сервис", image:"/images/banners/service.webp" },
  { label:"Лизинг", image:"/images/banners/finance.webp" },
  { label:"Новости", image:"/images/news/journal-hero-4k.webp" },
  { label:"О компании", image:"/images/banners/about.webp" },
  { label:"Контакты", image:"/images/banners/contacts-duo-v2.png" },
] as const;

const devices: Array<{ id:BannerViewport; label:string; Icon:typeof Laptop }> = [
  { id:"desktop", label:"Ноутбук", Icon:Laptop },
  { id:"tablet", label:"Планшет", Icon:Tablet },
  { id:"mobile", label:"Телефон", Icon:Smartphone },
];

export function AdminSiteSettings(){
  const [settings,setSettings]=useState<SiteSettings|null>(null);
  const [version,setVersion]=useState(0);
  const [state,setState]=useState<"loading"|"ready"|"saving">("loading");
  const [uploading,setUploading]=useState("");
  const [message,setMessage]=useState("");
  useEffect(()=>{fetch("/api/admin/settings",{cache:"no-store"}).then(async response=>{const body=await response.json() as {settings?:SiteSettings;version?:number;error?:string};if(!response.ok)throw new Error(body.error);setSettings(body.settings!);setVersion(body.version||0);setState("ready");}).catch(cause=>{setMessage(cause instanceof Error?cause.message:"Не удалось загрузить настройки");setState("ready");});},[]);

  function updateMedia(image:string,viewport:BannerViewport,url:string){
    setSettings(current=>{
      if(!current)return current;
      const media={...current.media},key=bannerMediaKey(image,viewport);
      if(url.trim())media[key]=url.trim();else delete media[key];
      return {...current,media};
    });
  }

  async function upload(event:ChangeEvent<HTMLInputElement>,image:string,viewport:BannerViewport){
    const file=event.target.files?.[0];event.target.value="";if(!file)return;
    const id=`${image}:${viewport}`;setUploading(id);setMessage("");
    try{
      const form=new FormData();form.set("file",file);
      const response=await fetch("/api/admin/media",{method:"POST",body:form});
      const body=await response.json() as {url?:string;error?:string};
      if(!response.ok||!body.url)throw new Error(body.error||"Не удалось загрузить изображение");
      updateMedia(image,viewport,body.url);setMessage("Изображение загружено. Нажмите «Сохранить настройки», чтобы применить его на сайте.");
    }catch(cause){setMessage(cause instanceof Error?cause.message:"Не удалось загрузить изображение");}
    finally{setUploading("");}
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!settings)return;setState("saving");setMessage("");const f=new FormData(event.currentTarget);
    const next:SiteSettings={...settings,phone:String(f.get("phone")),address:String(f.get("address")),instagram:String(f.get("instagram")),annualRate:f.get("annualRate")===""?null:Number(f.get("annualRate")),downPercent:Number(f.get("downPercent")),fee:Number(f.get("fee")),method:String(f.get("method")) as SiteSettings["method"]};
    const response=await fetch("/api/admin/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({settings:next,version})});
    const body=await response.json() as {error?:string};
    if(!response.ok){setMessage(body.error||"Не удалось сохранить");setState("ready");return;}
    setSettings(next);setVersion(value=>value+1);setMessage("Настройки сохранены и применены на сайте");setState("ready");
  }
  if(!settings)return <div className="admin-content"><div className="admin-panel crm-loading">{state==="loading"?<><LoaderCircle className="spin"/> Загружаем настройки…</>:message}</div></div>;
  return <div className="admin-content"><form className="admin-panel site-settings-form" onSubmit={submit}><header><i><Globe2/></i><div><span>Публичный сайт</span><h2>Контакты, лизинг и баннеры</h2><p>Изменения появятся на сайте только после сохранения формы.</p></div></header><div className="site-settings-grid"><label><span>Телефон</span><input name="phone" defaultValue={settings.phone} required/></label><label><span>Адрес офиса</span><input name="address" defaultValue={settings.address} required/></label><label className="full"><span>Instagram</span><input name="instagram" type="url" defaultValue={settings.instagram} required/></label><label><span>Годовая ставка, %</span><input name="annualRate" type="number" min="0" max="100" step=".01" defaultValue={settings.annualRate??""} placeholder="Уточняется банком"/></label><label><span>Первый взнос, %</span><input name="downPercent" type="number" min="0" max="100" step=".01" defaultValue={settings.downPercent}/></label><label><span>Комиссия, сом</span><input name="fee" type="number" min="0" step="1" defaultValue={settings.fee}/></label><label><span>График платежей</span><select name="method" defaultValue={settings.method}><option value="annuity">Равный платёж</option><option value="differentiated">Убывающий платёж</option></select></label></div><section className="banner-manager"><header><div><span><ImageIcon/> Медиатека сайта</span><h3>Баннеры для всех экранов</h3><p>Загрузите отдельные кадры для ноутбука, планшета и телефона. До замены используется штатное изображение страницы.</p></div></header><div className="banner-manager-grid">{bannerGroups.map(group=>{const preview=settings.media[group.image]||group.image;return <article className="banner-editor" key={group.image}><div className="banner-preview"><Image src={preview} alt="" width={640} height={360} unoptimized/><span>{group.label}</span></div><div className="banner-device-list">{devices.map(({id,label,Icon})=>{const key=bannerMediaKey(group.image,id),fallback=id==="mobile"&&"mobile" in group?group.mobile:settings.media[group.image]||group.image,value=settings.media[key]||fallback,busy=uploading===`${group.image}:${id}`;return <div className="banner-device" key={id}><span className="banner-device-name"><Icon/>{label}</span><input aria-label={`${group.label}, ${label}: ссылка`} value={value} onChange={event=>updateMedia(group.image,id,event.target.value)} /><label className={busy?"is-uploading":""}>{busy?<LoaderCircle className="spin"/>:<UploadCloud/>}<span>{busy?"Загрузка…":"Выбрать файл"}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={event=>void upload(event,group.image,id)} disabled={Boolean(uploading)}/></label></div>;})}</div></article>;})}</div></section>{message?<p className="crm-message" role="status">{message}</p>:null}<button className="admin-primary" disabled={state==="saving"||Boolean(uploading)} type="submit">{state==="saving"?<LoaderCircle className="spin"/>:<Check/>}Сохранить настройки</button></form></div>;
}
