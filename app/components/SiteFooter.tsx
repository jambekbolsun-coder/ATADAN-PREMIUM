import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Phone } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="site-footer" id="contacts">
      <div className="footer-top">
        <div>
          <span className="section-label light">Будем на связи</span>
          <h2>Ваше хозяйство.<br />Наша техника.</h2>
        </div>
        <a className="footer-contact" href="https://wa.me/996706131404" target="_blank" rel="noreferrer">Написать в WhatsApp <ArrowUpRight /></a>
      </div>
      <div className="footer-grid">
        <div className="footer-brand"><div className="footer-logo"><Image src="/atadan-logo-cropped.png" alt="ATADAN Changfa" width={260} height={90} /></div><p>Официальный дистрибьютор тракторов Changfa в Кыргызстане.</p></div>
        <div><strong>Навигация</strong><Link href="/catalog">Каталог</Link><Link href="/finance">Рассрочка</Link><Link href="/service">Сервис</Link><Link href="/about">О компании</Link></div>
        <div><strong>Контакты</strong><a href="tel:+996706131404"><Phone size={15} />+996 706 131 404</a><span><MapPin size={15} />Кыргызстан</span><a href="/admin">Вход для администратора</a></div>
      </div>
      <div className="footer-bottom"><span>© 2026 ATADAN Changfa</span><span>Техника для сильных хозяйств</span></div>
    </footer>
  );
}
