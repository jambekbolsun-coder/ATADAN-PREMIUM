import Image from "next/image";
import { Link } from "./components/SiteLink";
import { ArrowDownRight, ArrowUpRight, BadgeCheck, Banknote, Headphones, ShieldCheck, Wrench } from "lucide-react";
import { LeadForm } from "./components/LeadForm";
import { MotionReveal } from "./components/MotionReveal";
import { TractorCard } from "./components/TractorCard";
import { getCatalog } from "./lib/catalog";

export default async function Home() {
  const tractors = await getCatalog();
  const featured = [50, 90, 140, 240].map((hp) => tractors.find((tractor) => tractor.hp === hp)).filter(Boolean);
  const hero = tractors.find((tractor) => tractor.hp === 240) ?? tractors.at(-1)!;
  return (
    <main>
      <MotionReveal className="hero-wrap">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow" data-reveal>Официальный дистрибьютор Changfa в Кыргызстане</span>
            <h1 data-reveal>Сила, которая<br />двигает землю</h1>
            <p data-reveal>Подберём трактор под площадь, задачи и бюджет. Поставка, гарантия, сервис и удобная рассрочка — в одном месте.</p>
            <div className="hero-actions" data-reveal><Link className="primary-btn" href="/catalog">Подобрать трактор <ArrowUpRight size={18} /></Link><a className="ghost-btn" href="tel:+996706131404">+996 706 131 404</a></div>
            <div className="trust-row" data-reveal><div><strong>6 лет</strong><span>на рынке</span></div><div><strong>50–240 л.с.</strong><span>в каталоге</span></div><div><strong>41 модель</strong><span>Changfa</span></div></div>
          </div>
          <div className="hero-visual" data-reveal>
            <span className="model-chip">{hero.model} · {hero.hp} л.с.</span><Image src={hero.image} alt={`Трактор Changfa ${hero.model}`} width={980} height={760} priority sizes="(max-width: 900px) 100vw, 55vw" /><div className="hero-orbit" aria-hidden="true" />
            <Link className="hero-detail" href={`/catalog/${hero.slug}`}>Флагман линейки <ArrowDownRight size={18} /></Link>
          </div>
        </section>
      </MotionReveal>

      <section className="home-catalog section-shell">
        <div className="section-heading"><div><span className="section-label">Каталог техники</span><h2>Трактор под<br />каждую задачу</h2></div><div><p>От манёвренных 50‑сильных машин до тяжёлых флагманов для больших хозяйств.</p><Link className="text-link" href="/catalog">Смотреть все 41 модели <ArrowUpRight size={17} /></Link></div></div>
        <div className="featured-grid">{featured.map((tractor, index) => tractor ? <TractorCard tractor={tractor} featured={index === 0} key={tractor.slug} /> : null)}</div>
      </section>

      <section className="value-section section-shell">
        <div className="value-photo"><Image src="/images/tractors/cfj2004-g4.png" alt="Мощный трактор Changfa CFJ2004" width={920} height={690} /><span>Создан работать<br />в ваших условиях</span></div>
        <div className="value-copy"><span className="section-label">ATADAN рядом</span><h2>Не просто продаём технику. Отвечаем за результат.</h2><p>Помогаем выбрать комплектацию, оформить рассрочку, организуем поставку и остаёмся рядом после покупки.</p><div className="value-list"><div><i><BadgeCheck /></i><span><strong>Официальная техника</strong><small>Только оригинальные тракторы Changfa</small></span></div><div><i><Wrench /></i><span><strong>Сервис и запчасти</strong><small>Техническая поддержка после покупки</small></span></div><div><i><Banknote /></i><span><strong>Удобная рассрочка</strong><small>Индивидуальный график под хозяйство</small></span></div><div><i><Headphones /></i><span><strong>Живые консультации</strong><small>Подбор без лишнего давления</small></span></div></div><Link className="dark-btn" href="/about">Узнать об ATADAN <ArrowUpRight size={18} /></Link></div>
      </section>

      <section className="power-strip"><div><span className="section-label light">Линейка мощностей</span><h2>От 50 до 240 л.с.</h2></div><div className="power-scale">{[50, 80, 100, 140, 180, 240].map((power) => <Link href={`/catalog?power=${power}`} key={power}><strong>{power}</strong><span>л.с.</span></Link>)}</div></section>

      <section className="home-lead section-shell"><div><span className="section-label">Подберём вместе</span><h2>Расскажите о задачах — предложим технику</h2><p>Ответим, сравним подходящие модели и рассчитаем условия покупки или рассрочки.</p><div className="lead-promise"><ShieldCheck /><span>Ваши контакты используются только для ответа на заявку.</span></div></div><LeadForm /></section>
    </main>
  );
}
