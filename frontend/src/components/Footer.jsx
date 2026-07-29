import { Link } from 'react-router-dom'
import { Instagram, Phone, MapPin, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { whatsappUrl } from '../utils/helpers'
export default function Footer(){const {t}=useTranslation();return <footer className="footer"><div className="container footer-grid">
 <div><div className="footer-brand">ATADAN</div><p>{t('footer.company')}</p><a className="footer-contact" href="tel:+996706131404"><Phone size={18}/>+996 706 131 404</a><div className="footer-contact"><MapPin size={18}/>{t('footer.address')}</div></div>
 <div><h4>{t('nav.catalog')}</h4><Link to="/catalog">{t('nav.catalog')}</Link><Link to="/series">{t('nav.series')}</Link><Link to="/tractor-selector">{t('nav.selector')}</Link><Link to="/compare">{t('nav.compare')}</Link></div>
 <div><h4>{t('common.service')}</h4><Link to="/service">{t('nav.service')}</Link><Link to="/parts">{t('nav.parts')}</Link><Link to="/warranty">{t('common.warranty')}</Link><Link to="/delivery">Доставка</Link></div>
 <div><h4>{t('nav.contacts')}</h4><a href={whatsappUrl()} target="_blank" rel="noreferrer"><MessageCircle size={17}/> WhatsApp</a><a href="https://www.instagram.com/atadan_kg" target="_blank" rel="noreferrer"><Instagram size={17}/> Instagram</a><Link to="/privacy">Политика конфиденциальности</Link><Link to="/terms">Пользовательское соглашение</Link></div>
 </div><div className="container footer-bottom"><span>© {new Date().getFullYear()} ATADAN. {t('footer.rights')}</span><span>CHANGFA — товарный знак соответствующего правообладателя.</span></div></footer>}
