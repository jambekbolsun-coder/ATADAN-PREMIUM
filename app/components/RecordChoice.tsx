"use client";
import { useId, useState } from "react";
import { Plus } from "lucide-react";

export function RecordChoice({kind,name,value,options,required}:{kind:string;name:string;value:string;options:string[];required?:boolean}){
  const id=useId(),[selected,setSelected]=useState(value||options[0]||""),[items,setItems]=useState<string[]>([]),[adding,setAdding]=useState(false),[draft,setDraft]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const available=Array.from(new Set([...options,...items]));
  async function add(){if(!draft.trim()||busy)return;setBusy(true);try{const response=await fetch("/api/admin/record-options",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind,action:"add_choice",field:name,value:draft.trim()})});if(!response.ok)throw new Error("Не удалось добавить категорию");setItems(current=>Array.from(new Set([...current,draft.trim()])));setSelected(draft.trim());setAdding(false);setDraft("");setError("")}catch(e){setError(e instanceof Error?e.message:"Ошибка сети")}finally{setBusy(false)}}
  return <span className="record-choice"><span><input name={name} list={id} value={selected} onChange={e=>setSelected(e.target.value)} required={required} maxLength={100}/><datalist id={id}>{available.map(item=><option key={item} value={item}/>)}</datalist><button type="button" aria-label="Добавить свою категорию" onClick={()=>setAdding(v=>!v)}><Plus/></button></span>{adding?<span><input aria-label="Новая категория" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={100}/><button type="button" disabled={busy} onClick={()=>void add()}>Добавить</button></span>:null}{error?<small role="alert">{error}</small>:null}</span>;
}
