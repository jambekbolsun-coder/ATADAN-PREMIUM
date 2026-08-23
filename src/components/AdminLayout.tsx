import { ArrowUpRight, BarChart3, FileImage, Globe2, LayoutDashboard, LogOut, Menu, Tractor, X } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Wordmark } from './Wordmark'

const links = [['/admin', LayoutDashboard, 'Обзор'], ['/admin/tractors', Tractor, 'Тракторы'], ['/admin/content', Globe2, 'Сайт'], ['/admin/analytics', BarChart3, 'Аналитика'], ['/admin/media', FileImage, 'Медиа']] as const
export function AdminLayout() {
  const [open, setOpen] = useState(false); const navigate = useNavigate()
  const signOut = async () => { await supabase.auth.signOut(); navigate('/admin/login') }
  const sidebar = <aside className="admin-sidebar"><div className="admin-sidebar__brand"><Wordmark inverse/></div><nav>{links.map(([to, Icon, label]) => <NavLink key={to} end={to === '/admin'} to={to} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={18}/>{label}</NavLink>)}</nav><div className="admin-sidebar__footer"><button onClick={signOut}><LogOut size={18}/>Выйти</button></div></aside>
  return <div className="admin-shell">{sidebar}<div className="admin-workspace"><header className="admin-topbar"><div className="admin-topbar__title"><button className="admin-topbar__menu" onClick={() => setOpen(true)}><Menu/></button><h1>ATADAN Admin</h1></div><a href="/ru" target="_blank" className="admin-topbar__site">Открыть сайт<ArrowUpRight size={15}/></a></header><main className="admin-content"><Outlet/></main></div>{open && <><button className="admin-drawer__backdrop" onClick={() => setOpen(false)} aria-label="Закрыть"/><div className="admin-drawer">{sidebar}<button className="admin-drawer__close" onClick={() => setOpen(false)}><X/></button></div></>}</div>
}
