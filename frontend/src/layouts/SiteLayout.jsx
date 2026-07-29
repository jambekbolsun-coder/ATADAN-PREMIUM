import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import Footer from '../components/Footer'
import WhatsAppFloat from '../components/WhatsAppFloat'
export default function SiteLayout(){
  const {pathname}=useLocation(); const {i18n}=useTranslation()
  useEffect(()=>{window.scrollTo({top:0,behavior:'auto'})},[pathname])
  useEffect(()=>{document.documentElement.lang=i18n.resolvedLanguage||'ru'},[i18n.resolvedLanguage])
  return <><Header/><main><Outlet/></main><Footer/><WhatsAppFloat/></>
}
