import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Menu, X, Phone, MapPin, GitCompareArrows } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import { useAppStore } from '../context/useAppStore'

const links=[['/catalog','catalog'],['/series','series'],['/tractor-selector','selector'],['/leasing','leasing'],['/parts','parts'],['/service','service'],['/about','about'],['/contacts','contacts']]
export default function Header(){
 const [open,setOpen]=useState(false); const {t}=useTranslation(); const compare=useAppStore(s=>s.compare)
 return <>
  <div className="topbar"><div className="container topbar-inner"><span>{t('topbar')}</span><span className="topbar-links"><a href="tel:+996706131404"><Phone size={14}/> +996 706 131 404</a><Link to="/contacts"><MapPin size={14}/> {t('footer.address')}</Link></span></div></div>
  <header className="header"><div className="container header-inner">
   <Link className="brand" to="/" onClick={()=>setOpen(false)}><span className="brand-mark">A</span><span><b>ATADAN</b><small>{t('brandTagline')}</small></span></Link>
   <nav className={open?'nav open':'nav'}>{links.map(([path,key])=><NavLink key={path} to={path} onClick={()=>setOpen(false)}>{t(`nav.${key}`)}</NavLink>)}</nav>
   <div className="header-actions"><Link className="compare-chip" to="/compare" aria-label={t('nav.compare')}><GitCompareArrows size={18}/><span>{compare.length}</span></Link><LanguageSwitcher/><button className="menu-btn" onClick={()=>setOpen(!open)} aria-label="Menu">{open?<X/>:<Menu/>}</button></div>
  </div></header>
 </>
}
