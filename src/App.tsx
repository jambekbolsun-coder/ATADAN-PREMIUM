import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { TractorsPage } from './pages/TractorsPage'
import { TractorDetailPage } from './pages/TractorDetailPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminLayout } from './components/AdminLayout'
import { ProtectedAdmin } from './components/ProtectedAdmin'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminTractorsPage } from './pages/AdminTractorsPage'
import { AdminTractorEditorPage } from './pages/AdminTractorEditorPage'
import { AdminContentPage } from './pages/AdminContentPage'
import { AdminAnalyticsPage } from './pages/AdminAnalyticsPage'
import { AdminMediaPage } from './pages/AdminMediaPage'
import { localeFromPath } from './lib/i18n'
import { trackEvent } from './lib/analytics'
import type { Locale } from './lib/types'

function localeValid(value?: string): value is Locale { return value === 'ru' || value === 'kg' || value === 'en' }
function PublicRoute({ page }: { page: 'home'|'tractors'|'detail' }) {
  const { locale } = useParams()
  if (!localeValid(locale)) return <Navigate to="/ru" replace />
  if (page === 'tractors') return <TractorsPage locale={locale}/>
  if (page === 'detail') return <TractorDetailPage locale={locale}/>
  return <HomePage locale={locale}/>
}
function RouteAnalytics(){const location=useLocation();useEffect(()=>{if(location.pathname.startsWith('/admin'))return;trackEvent('page_view',{locale:localeFromPath(location.pathname),metadata:{path:location.pathname}})},[location.pathname,location.search]);return null}
export default function App(){return <BrowserRouter><RouteAnalytics/><Routes><Route path="/" element={<Navigate to="/ru" replace/>}/><Route path="/:locale" element={<PublicRoute page="home"/>}/><Route path="/:locale/tractors" element={<PublicRoute page="tractors"/>}/><Route path="/:locale/tractors/:slug" element={<PublicRoute page="detail"/>}/><Route path="/admin/login" element={<AdminLoginPage/>}/><Route path="/admin" element={<ProtectedAdmin><AdminLayout/></ProtectedAdmin>}><Route index element={<AdminDashboardPage/>}/><Route path="tractors" element={<AdminTractorsPage/>}/><Route path="tractors/new" element={<AdminTractorEditorPage/>}/><Route path="tractors/:id" element={<AdminTractorEditorPage/>}/><Route path="content" element={<AdminContentPage/>}/><Route path="analytics" element={<AdminAnalyticsPage/>}/><Route path="media" element={<AdminMediaPage/>}/></Route><Route path="*" element={<Navigate to="/ru" replace/>}/></Routes></BrowserRouter>}
