import { Routes, Route } from 'react-router-dom'
import SiteLayout from './layouts/SiteLayout'
import HomePage from './pages/HomePage'
import CatalogPage from './pages/CatalogPage'
import TractorDetailPage from './pages/TractorDetailPage'
import SeriesPage from './pages/SeriesPage'
import SeriesDetailPage from './pages/SeriesDetailPage'
import SelectorPage from './pages/SelectorPage'
import ComparePage from './pages/ComparePage'
import LeasingPage from './pages/LeasingPage'
import PartsPage from './pages/PartsPage'
import PartsCategoryPage from './pages/PartsCategoryPage'
import TractorPartsGuidePage from './pages/TractorPartsGuidePage'
import ImplementsPage from './pages/ImplementsPage'
import ServicePage from './pages/ServicePage'
import WarrantyPage from './pages/WarrantyPage'
import AboutPage from './pages/AboutPage'
import ChangfaPage from './pages/ChangfaPage'
import DeliveryPage from './pages/DeliveryPage'
import BlogPage from './pages/BlogPage'
import BlogArticlePage from './pages/BlogArticlePage'
import FaqPage from './pages/FaqPage'
import ContactsPage from './pages/ContactsPage'
import CommercialOfferPage from './pages/CommercialOfferPage'
import LegalPage from './pages/LegalPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App(){return <Routes><Route element={<SiteLayout/>}>
 <Route path="/" element={<HomePage/>}/>
 <Route path="/catalog" element={<CatalogPage/>}/>
 <Route path="/tractors/:slug" element={<TractorDetailPage/>}/>
 <Route path="/series" element={<SeriesPage/>}/>
 <Route path="/series/:slug" element={<SeriesDetailPage/>}/>
 <Route path="/tractor-selector" element={<SelectorPage/>}/>
 <Route path="/compare" element={<ComparePage/>}/>
 <Route path="/leasing" element={<LeasingPage/>}/>
 <Route path="/parts" element={<PartsPage/>}/>
 <Route path="/parts/:category" element={<PartsCategoryPage/>}/>
 <Route path="/tractor-parts-guide" element={<TractorPartsGuidePage/>}/>
 <Route path="/implements" element={<ImplementsPage/>}/>
 <Route path="/service" element={<ServicePage/>}/>
 <Route path="/warranty" element={<WarrantyPage/>}/>
 <Route path="/about" element={<AboutPage/>}/>
 <Route path="/changfa" element={<ChangfaPage/>}/>
 <Route path="/delivery" element={<DeliveryPage/>}/>
 <Route path="/blog" element={<BlogPage/>}/>
 <Route path="/blog/:slug" element={<BlogArticlePage/>}/>
 <Route path="/faq" element={<FaqPage/>}/>
 <Route path="/contacts" element={<ContactsPage/>}/>
 <Route path="/commercial-offer/:slug" element={<CommercialOfferPage/>}/>
 <Route path="/privacy" element={<LegalPage type="privacy"/>}/>
 <Route path="/terms" element={<LegalPage type="terms"/>}/>
 <Route path="*" element={<NotFoundPage/>}/>
 </Route></Routes>}
