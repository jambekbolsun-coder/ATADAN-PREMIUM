import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
export function ProtectedAdmin({children}:{children:React.ReactNode}){const[state,setState]=useState<'loading'|'ok'|'no'>('loading');useEffect(()=>{supabase.auth.getSession().then(async({data})=>{const user=data.session?.user;if(!user){setState('no');return}const{data:admin}=await supabase.from('atadan_admins').select('role').eq('user_id',user.id).maybeSingle();setState(admin?'ok':'no')})},[]);if(state==='loading')return <div className="grid min-h-screen place-items-center text-sm text-neutral-500">Загрузка…</div>;if(state==='no')return <Navigate to="/admin/login" replace/>;return <>{children}</>}
