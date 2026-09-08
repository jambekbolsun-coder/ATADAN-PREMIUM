"use client";

import { Check, Globe2, LoaderCircle } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { SiteSettings } from "../lib/site-settings-types";

export function AdminSiteSettings(){
  const [settings,setSettings]=useState<SiteSettings|null>(null);
  const [version,setVersion]=useState(0);
  const [state,setState]=useState<"loading"|"ready"|"saving">("loading");
  const [message,setMessage]=useState("");
  useEffect(()=>{fetch("/api/admin/settings",{cache:"no-store"}).then(async response=>{const body=await response.json() as {settings?:SiteSettings;version?:number;error?:string};if(!response.ok)throw new Error(body.error);setSettings(body.settings!);setVersion(body.version||0);setState("ready");}).catch(cause=>{setMessage(cause instanceof Error?cause.message:"Не удалось загрузить настройки");setState("ready");});},[]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!settings)return;setState("saving");setMessage("");const f=new FormData(event.currentTarget);
    const next:SiteSettings={...settings,phone:String(f.get("phone")),address:String(f.get("address")),instagram:String(f.get("instagram")),annualRate:f.get("annualRate")===""?null:Number(f.get("annualRate")),downPercent:Number(f.get("downPercent")),fee:Number(f.get("fee")),method:String(f.get("method")) as SiteSettings["method"]};
    const response=await fetch("/api/admin/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({settings:next,version})});
    const body=await response.json() as {error?:string};
    if(!response.ok){setMessage(body.error||"Не удалось сохранить");setState("ready");return;}
    setSettings(next);setVersion(value=>value+1);setMessage("Настройки сайта сохранены в SQL");setState("ready");
  }
  if(!settings)return <div className="admin-content"><div className="admin-panel crm-loading">{state==="loading"?<><LoaderCircle className="spin"/> Загружаем настройки…</>:message}</div></div>;
  return <div className="admin-content"><form className="admin-panel site-settings-form" onSubmit={submit}><header><i><Globe2/></i><div><span>Публичный сайт</span><h2>Контакты и условия лизинга</h2><p>Изменения сохраняются в SQL и применяются ко всем страницам.</p></div></header><div className="site-settings-grid"><label><span>Телефон</span><input name="phone" defaultValue={settings.phone} required/></label><label><span>Адрес офиса</span><input name="address" defaultValue={settings.address} required/></label><label className="full"><span>Instagram</span><input name="instagram" type="url" defaultValue={settings.instagram} required/></label><label><span>Годовая ставка, %</span><input name="annualRate" type="number" min="0" max="100" step=".01" defaultValue={settings.annualRate??""} placeholder="Уточняется банком"/></label><label><span>Первый взнос, %</span><input name="downPercent" type="number" min="0" max="100" step=".01" defaultValue={settings.downPercent}/></label><label><span>Комиссия, сом</span><input name="fee" type="number" min="0" step="1" defaultValue={settings.fee}/></label><label><span>График платежей</span><select name="method" defaultValue={settings.method}><option value="annuity">Равный платёж</option><option value="differentiated">Убывающий платёж</option></select></label></div>{message?<p className="crm-message" role="status">{message}</p>:null}<button className="admin-primary" disabled={state==="saving"} type="submit">{state==="saving"?<LoaderCircle className="spin"/>:<Check/>}Сохранить настройки</button></form></div>;
}
