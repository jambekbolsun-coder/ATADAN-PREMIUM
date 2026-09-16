"use client";

import Image from "next/image";
import { CheckCircle2, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "../../components/SiteLink";

export default function JoinTeamPage(){
  const token=useRef("");
  const [email,setEmail]=useState("");
  const [status,setStatus]=useState<"loading"|"ready"|"done"|"error">("loading");
  const [message,setMessage]=useState("");
  useEffect(()=>{
    const value=window.location.hash.replace(/^#(?:token=)?/,"");
    if(!/^[a-f0-9]{64}$/i.test(value)){queueMicrotask(()=>{setStatus("error");setMessage("Ссылка приглашения повреждена.");});return;}
    token.current=value;
    fetch("/api/admin/join",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"inspect",token:value})})
      .then(async response=>{const body=await response.json() as {email?:string;error?:string};if(!response.ok)throw new Error(body.error);setEmail(body.email||"");setStatus("ready");})
      .catch(cause=>{setStatus("error");setMessage(cause instanceof Error?cause.message:"Приглашение недоступно");});
  },[]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setStatus("loading");const form=new FormData(event.currentTarget);
    const password=String(form.get("password")||""),confirmation=String(form.get("confirmation")||"");
    if(password!==confirmation){setStatus("ready");setMessage("Пароли не совпадают");return;}
    const response=await fetch("/api/admin/join",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create",token:token.current,name:form.get("name"),password})});
    const body=await response.json() as {error?:string};
    if(!response.ok){setStatus("ready");setMessage(body.error||"Не удалось создать аккаунт");return;}
    history.replaceState(null,"",location.pathname);setStatus("done");setMessage("");
  }
  return <main className="join-page"><section className="join-card">
    <Image src="/atadan-logo-cropped.png" alt="ATADAN Changfa" width={250} height={86}/>
    {status==="loading"?<div className="join-state"><LoaderCircle className="spin"/><h1>Проверяем приглашение</h1></div>:null}
    {status==="error"?<div className="join-state error"><ShieldCheck/><h1>Ссылка недоступна</h1><p>{message}</p><Link href="/admin">Вернуться ко входу</Link></div>:null}
    {status==="done"?<div className="join-state success"><CheckCircle2/><h1>Аккаунт создан</h1><p>Теперь войдите с адресом <strong>{email}</strong> и новым паролем.</p><Link className="admin-primary" href="/admin">Войти в кабинет</Link></div>:null}
    {status==="ready"?<form onSubmit={submit}><span className="join-icon"><KeyRound/></span><h1>Создайте аккаунт</h1><p>Приглашение для <strong>{email}</strong></p><label><span>Ваше имя</span><input name="name" required minLength={2} maxLength={120} autoComplete="name"/></label><label><span>Новый пароль</span><input name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password"/></label><label><span>Повторите пароль</span><input name="confirmation" type="password" required minLength={10} maxLength={128} autoComplete="new-password"/></label>{message?<p className="admin-error" role="alert">{message}</p>:null}<button className="admin-primary" type="submit">Создать аккаунт</button></form>:null}
  </section></main>;
}
