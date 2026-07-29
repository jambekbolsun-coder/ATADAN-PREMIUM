import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { submitLead } from '../services/api'
import { whatsappUrl } from '../utils/helpers'
export default function LeadForm({source='website',compact=false}){
 const {t}=useTranslation(); const [status,setStatus]=useState(''); const {register,handleSubmit,formState:{errors},reset}=useForm()
 const onSubmit=async(data)=>{setStatus('loading');try{await submitLead({...data,source});setStatus('success');reset()}catch{setStatus('error')}}
 return <form className={`lead-form ${compact?'compact':''}`} onSubmit={handleSubmit(onSubmit)}>
  <div className="form-row"><label><span>{t('forms.name')}</span><input {...register('name',{required:true})} placeholder={t('forms.name')}/>{errors.name&&<small>{t('forms.required')}</small>}</label><label><span>{t('forms.phone')}</span><input {...register('phone',{required:true})} placeholder="+996 ___ ___ ___"/>{errors.phone&&<small>{t('forms.required')}</small>}</label></div>
  <label><span>{t('forms.message')}</span><textarea {...register('message')} rows={compact?3:4} placeholder={t('forms.message')}/></label>
  <button className="btn btn-gold" disabled={status==='loading'}>{status==='loading'?'...':t('actions.submit')}</button><p className="form-consent">{t('forms.consent')}</p>
  {status==='success'&&<div className="form-status success">{t('forms.success')}</div>}{status==='error'&&<div className="form-status error">{t('forms.error')} <a href={whatsappUrl()} target="_blank" rel="noreferrer">WhatsApp</a></div>}
 </form>
}
