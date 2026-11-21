"use client";

import { ArrowUpRight, BadgeCheck, CheckCircle2, Cookie, FileSignature, FileText, Languages, LockKeyhole, Mail, ShieldCheck, UserCheck } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Link } from "./SiteLink";
import { useI18n, useLocalizedAddress } from "./I18n";
import { useSiteSettings } from "./SiteSettings";
import { OPEN_PRIVACY_SETTINGS_EVENT, PRIVACY_CHOICE_EVENT, PRIVACY_CHOICE_KEY } from "./CookieConsent";
import { ScrollReveal } from "./ScrollReveal";

export type LegalKind = "privacy" | "terms" | "cookies";

type Block = { title: string; text: string; points?: string[] };

const content: Record<"ru" | "ky" | "en", Record<LegalKind, { kicker: string; title: string; intro: string; updated: string; blocks: Block[] }>> = {
  ru: {
    privacy: { kicker:"Защита данных", title:"Политика конфиденциальности", intro:"Здесь простым языком объяснено, какие данные получает ATADAN, зачем они нужны и как связаться с нами по вопросам обработки.", updated:"Редакция от 9 сентября 2026 года", blocks:[
      {title:"Какие данные мы получаем",text:"Когда вы сами отправляете заявку, мы получаем только данные, необходимые для ответа и подбора техники.",points:["Имя и номер телефона","Комментарий и выбранная модель, если вы их указали","Дата согласия и версия текста согласия"]},
      {title:"Зачем мы их используем",text:"Чтобы связаться с вами, уточнить задачу хозяйства, подготовить предложение, вести историю обращения в CRM и не просить повторять уже переданную информацию."},
      {title:"Аналитика сайта",text:"Она выключена до вашего выбора. После разрешения фиксируются посещённый путь, модель трактора и случайный идентификатор устройства. Имя, телефон и текст заявки в аналитику не передаются."},
      {title:"Хранение и доступ",text:"Доступ имеют только уполномоченные сотрудники ATADAN и технические поставщики хостинга в объёме, необходимом для работы сайта. Данные хранятся не дольше, чем этого требует цель обращения или применимое законодательство."},
      {title:"Ваши права",text:"Вы можете запросить сведения об обработке, исправление, ограничение или удаление данных, а также отозвать необязательное согласие. Напишите или позвоните по контактам ниже."},
      {title:"Правовая основа",text:"Мы учитываем принципы прозрачности, минимизации и ограничения хранения из Цифрового кодекса Кыргызской Республики. Эта страница описывает фактическую работу сайта и не заменяет индивидуальную юридическую консультацию."},
    ]},
    terms: { kicker:"Правила сайта", title:"Условия использования", intro:"Правила помогают правильно понимать каталог, цены, расчёты и материалы сайта ATADAN Changfa.", updated:"Редакция от 9 сентября 2026 года", blocks:[
      {title:"Назначение сайта",text:"Сайт знакомит с техникой Changfa, сервисом ATADAN и позволяет оставить запрос на консультацию. Он не является интернет-магазином и не принимает оплату."},
      {title:"Каталог и характеристики",text:"Характеристики собраны по материалам производителя и могут отличаться в зависимости от комплектации и рынка поставки. Финальные параметры закрепляются в предложении или договоре."},
      {title:"Цена и финансирование",text:"Фраза «цена по запросу» означает, что стоимость зависит от комплектации и поставки. Калькулятор лизинга показывает предварительный пример; окончательные условия подтверждает финансовый партнёр."},
      {title:"Материалы и права",text:"Логотип и фирменные материалы ATADAN используются компанией. Каталожные изображения Changfa связаны с официальными страницами производителя; собственные визуалы сайта созданы или предоставлены для проекта. Копирование третьими лицами допускается только при наличии правового основания."},
      {title:"Внешние сервисы",text:"WhatsApp, Instagram, карты и ссылки Changfa открываются по вашему действию и работают по правилам соответствующих сервисов."},
      {title:"Связь",text:"Если вы заметили неточность в характеристиках, правах на материал или работе сайта, сообщите ATADAN: мы проверим и при необходимости исправим публикацию."},
    ]},
    cookies: { kicker:"Настройки браузера", title:"Политика cookie", intro:"Сайт использует минимальный объём локального хранилища. Рекламных пикселей и сторонних систем аналитики в коде нет.", updated:"Редакция от 9 сентября 2026 года", blocks:[
      {title:"Необходимые настройки",text:"Они нужны для выбранного языка, закрытия подсказки, сохранения решения о приватности и защищённой сессии сотрудников в /admin. Без них отдельные функции будут неудобны или недоступны."},
      {title:"Необязательная статистика",text:"Псевдонимный ключ atadan_visitor создаётся только после нажатия «Разрешить аналитику». Он случайный и используется для подсчёта уникальных устройств и интереса к страницам каталога."},
      {title:"Что не используется",text:"На сайте не обнаружены Google Analytics, Meta Pixel, рекламные cookie, трекеры поведения или передача имени и телефона в аналитику."},
      {title:"Внешние сайты",text:"Переход в WhatsApp, Instagram или Changfa передаёт управление стороннему сайту. Интерактивная карта загружается только после отдельного нажатия."},
      {title:"Как изменить выбор",text:"Откройте настройки cookie внизу сайта. При выборе «Только необходимые» аналитический идентификатор удаляется, а новые аналитические события не отправляются."},
    ]},
  },
  ky: {
    privacy:{kicker:"Маалыматтарды коргоо",title:"Купуялык саясаты",intro:"ATADAN кайсы маалыматтарды, эмне үчүн алаарын жана өз укуктарыңыз боюнча кантип байланышууга болорун түшүндүрөбүз.",updated:"2026-жылдын 9-сентябрындагы редакция",blocks:[{title:"Чогултулган маалымат",text:"Өтүнмө жөнөткөндө аты-жөнүңүздү, телефонуңузду, комментарийди жана тандалган моделди гана алабыз."},{title:"Максат",text:"Сиз менен байланышуу, техниканы тандоо, сунуш даярдоо жана кайрылуунун тарыхын CRMде сактоо."},{title:"Аналитика",text:"Сиз уруксат бергенге чейин өчүк. Анда барактын жолу, трактор модели жана кокустук идентификатор гана сакталат."},{title:"Сактоо жана укуктар",text:"Маалымат максатка керектүү мөөнөттөн узак сакталбайт. Тактоо, чектөө, өчүрүү же макулдукту кайтарып алуу үчүн ATADANга кайрылыңыз."},{title:"Укуктук негиз",text:"Кыргыз Республикасынын Санарип кодексиндеги ачыктык, минималдаштыруу жана сактоо мөөнөтүн чектөө принциптери эске алынат."}]},
    terms:{kicker:"Сайттын эрежелери",title:"Колдонуу шарттары",intro:"Каталог, баалар жана эсептөөлөр тууралуу маанилүү шарттар.",updated:"2026-жылдын 9-сентябрындагы редакция",blocks:[{title:"Сайттын максаты",text:"Сайт Changfa техникасы менен тааныштырат жана консультацияга суроо калтырууга мүмкүндүк берет. Онлайн төлөм кабыл алынбайт."},{title:"Каталог",text:"Мүнөздөмөлөр комплектацияга жана жеткирүү рыногуна жараша айырмаланышы мүмкүн. Акыркы маалымат келишимде бекитилет."},{title:"Каржылоо",text:"Лизинг калькулятору алдын ала мисал көрсөтөт. Акыркы шарттарды каржы өнөктөшү ырастайт."},{title:"Материалдар",text:"Changfa каталогдук сүрөттөрү өндүрүүчүнүн расмий барактары менен байланышкан; калган визуалдар долбоор үчүн берилген же түзүлгөн."}]},
    cookies:{kicker:"Браузер жөндөөлөрү",title:"Cookie саясаты",intro:"Сайт локалдык сактагычты минималдуу колдонот жана жарнамалык трекерлерди колдонбойт.",updated:"2026-жылдын 9-сентябрындагы редакция",blocks:[{title:"Керектүү сактагыч",text:"Тил, купуялык тандоосу жана /admin кызматкер сессиясы үчүн керек."},{title:"Аналитика",text:"atadan_visitor кокустук ачкычы сиз уруксат бергенден кийин гана түзүлөт."},{title:"Тышкы кызматтар",text:"WhatsApp, Instagram, Changfa жана карта сиз басканда гана ачылат."},{title:"Тандоону өзгөртүү",text:"Сайттын ылдый жагындагы cookie жөндөөлөрүн ачыңыз."}]},
  },
  en: {
    privacy:{kicker:"Data protection",title:"Privacy policy",intro:"A plain-language explanation of what ATADAN receives, why it is needed and how to exercise your data rights.",updated:"Version dated 9 September 2026",blocks:[{title:"Data we receive",text:"When you submit a request, we collect only your name, phone, optional message, selected model and the consent record."},{title:"Purpose",text:"We use it to contact you, recommend equipment, prepare an offer and keep the interaction history in the CRM."},{title:"Analytics",text:"Analytics is off until you allow it. It records only the visited path, tractor model and a random identifier: never your name or phone."},{title:"Retention and access",text:"Only authorised ATADAN staff and necessary hosting providers have access. Data is retained only while needed for the request or required by applicable law."},{title:"Your rights",text:"You may request access, correction, restriction or deletion and withdraw optional consent by contacting ATADAN."},{title:"Legal approach",text:"The website follows the transparency, minimisation and storage-limitation principles of the Digital Code of the Kyrgyz Republic."}]},
    terms:{kicker:"Website rules",title:"Terms of use",intro:"Important conditions for understanding the catalogue, prices and calculations.",updated:"Version dated 9 September 2026",blocks:[{title:"Purpose",text:"The website presents Changfa equipment and ATADAN services. It is not an online store and accepts no payments."},{title:"Catalogue",text:"Specifications may vary by configuration and market. Final parameters are confirmed in the commercial offer or contract."},{title:"Financing",text:"The leasing calculator is an indicative example. A finance partner confirms the final terms."},{title:"Materials",text:"Changfa catalogue imagery links to manufacturer sources; other project visuals were supplied or created for ATADAN."}]},
    cookies:{kicker:"Browser settings",title:"Cookie policy",intro:"The site uses minimal local storage and contains no advertising trackers.",updated:"Version dated 9 September 2026",blocks:[{title:"Essential storage",text:"Used for language, privacy choice and protected staff sessions under /admin."},{title:"Analytics",text:"The random atadan_visitor key is created only after permission."},{title:"External services",text:"WhatsApp, Instagram, Changfa and the map open only after your action."},{title:"Change your choice",text:"Open cookie settings in the website footer at any time."}]},
  },
};

const icons = [ShieldCheck, LockKeyhole, CheckCircle2, FileText, Cookie, Mail];

const NEXT_LINKS = [
  { href: "/catalog", image: "/images/banners/catalog.webp", title: "ui.legal.nextCatalog", text: "ui.legal.nextCatalogText" },
  { href: "/finance", image: "/images/banners/finance.webp", title: "ui.legal.nextFinance", text: "ui.legal.nextFinanceText" },
  { href: "/about", image: "/images/banners/about.webp", title: "ui.legal.nextAbout", text: "ui.legal.nextAboutText" },
] as const;

/** Текущий выбор посетителя о cookie, обновляется после нового выбора в баннере. */
function useConsentChoice() {
  const [choice, setChoice] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const read = () => setChoice(window.localStorage.getItem(PRIVACY_CHOICE_KEY));
    const timer = window.setTimeout(read, 0);
    window.addEventListener(PRIVACY_CHOICE_EVENT, read);
    return () => { window.clearTimeout(timer); window.removeEventListener(PRIVACY_CHOICE_EVENT, read); };
  }, []);
  return choice;
}

/** Подсветка в оглавлении раздела, который сейчас на экране. */
function useActiveSection(count: number) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const nodes = Array.from({ length: count }, (_, index) => document.getElementById(`legal-${index + 1}`)).filter((node): node is HTMLElement => Boolean(node));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(nodes.indexOf(visible.target as HTMLElement));
    }, { rootMargin: "-30% 0px -55% 0px" });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [count]);
  return active;
}

export function LegalPage({ kind }: { kind: LegalKind }) {
  const { locale, t } = useI18n();
  const address = useLocalizedAddress();
  const settings = useSiteSettings();
  const page = content[locale][kind];
  const choice = useConsentChoice();
  const active = useActiveSection(page.blocks.length);
  const openSettings = () => window.dispatchEvent(new Event(OPEN_PRIVACY_SETTINGS_EVENT));
  const badges = kind === "terms"
    ? [{ Icon: BadgeCheck, text: t("ui.prod.why1") }, { Icon: FileSignature, text: t("ui.prod.why2") }, { Icon: ShieldCheck, text: t("ui.prod.why3") }]
    : [{ Icon: ShieldCheck, text: t("ui.legal.badge1") }, { Icon: UserCheck, text: t("ui.legal.badge2") }, { Icon: LockKeyhole, text: t("ui.legal.badge3") }];
  const stored = [
    { Icon: Languages, title: "ui.legal.stored.lang", note: "ui.legal.stored.langNote" },
    { Icon: Cookie, title: "ui.legal.stored.choice", note: "ui.legal.stored.choiceNote" },
    { Icon: FileText, title: "ui.legal.stored.visitor", note: "ui.legal.stored.visitorNote" },
    { Icon: LockKeyhole, title: "ui.legal.stored.admin", note: "ui.legal.stored.adminNote" },
  ];
  const choiceText = choice === "analytics" ? t("ui.legal.choice.all") : choice === "necessary" ? t("ui.legal.choice.necessary") : t("ui.legal.choice.none");
  const phoneDigits = settings.phone.replace(/\D/g, "");
  return <main className="legal-page legal-v5">
    <section className="legal-hero">
      <div className="legal-hero-bg" aria-hidden="true"><i /><i /><i /></div>
      <div className="section-shell legal-hero-grid">
        <div className="legal-hero-copy"><span>{page.kicker}</span><h1>{page.title}</h1><p>{page.intro}</p><small>{page.updated}</small></div>
        <div className="legal-hero-visual" aria-hidden="true">
          <div className="legal-hero-ring" />
          <Image src="/images/tractors-4k/cfg1404-g4.webp" alt="" width={720} height={540} sizes="(max-width: 900px) 70vw, 36vw" priority />
          {badges.map(({ Icon, text }, index) => <span key={text} className={`legal-badge legal-badge-${index + 1}`}><Icon size={16} />{text}</span>)}
        </div>
      </div>
    </section>
    <section className="section-shell legal-layout">
      <aside>
        <small className="legal-aside-label">{t("ui.legal.contents")}</small>
        <ol className="legal-toc">{page.blocks.map((block, index) => <li key={block.title}><a href={`#legal-${index + 1}`} aria-current={active === index ? "true" : undefined}><span>{String(index + 1).padStart(2, "0")}</span>{block.title}</a></li>)}</ol>
        <nav><Link href="/privacy" aria-current={kind === "privacy" ? "page" : undefined}>{t("ui.legal.navPrivacy")}</Link><Link href="/terms" aria-current={kind === "terms" ? "page" : undefined}>{t("ui.legal.navTerms")}</Link><Link href="/cookies" aria-current={kind === "cookies" ? "page" : undefined}>{t("ui.legal.navCookies")}</Link></nav>
        <div className="legal-aside-contact"><strong>ATADAN · Changfa</strong><p>{address}<br/>{settings.phone}</p></div>
      </aside>
      <div className="legal-blocks">
        {kind === "cookies" ? <div className="legal-cookie-panel">
          <div className="legal-choice"><small>{t("ui.legal.choiceTitle")}</small><strong data-choice={choice ?? "none"}><i aria-hidden="true" />{choice === undefined ? "…" : choiceText}</strong><button type="button" onClick={openSettings}><Cookie size={17} aria-hidden="true" />{t("ui.legal.change")}</button></div>
          <div className="legal-stored"><small>{t("ui.legal.storedTitle")}</small><ul>{stored.map(({ Icon, title, note }) => <li key={title}><Icon size={17} aria-hidden="true" /><span><b>{t(title)}</b>{t(note)}</span></li>)}</ul></div>
        </div> : null}
        <ScrollReveal className="legal-articles">{page.blocks.map((block, index) => { const Icon = icons[index % icons.length]; return <article key={block.title} id={`legal-${index + 1}`} data-reveal><i><Icon aria-hidden="true" /></i><div><span>{String(index + 1).padStart(2, "0")}</span><h2>{block.title}</h2><p>{block.text}</p>{block.points ? <ul>{block.points.map((point) => <li key={point}>{point}</li>)}</ul> : null}</div></article>; })}</ScrollReveal>
        <div className="legal-contact"><div><strong>ATADAN</strong><p>{settings.phone} · {address}</p></div>{kind === "cookies" ? <button type="button" onClick={openSettings}><Cookie aria-hidden="true" />{t("ui.legal.cookieSettings")}</button> : <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer">{t("nav.contact")} <ArrowUpRight aria-hidden="true" /></a>}</div>
      </div>
    </section>
    <section className="section-shell legal-next" aria-labelledby="legal-next-title">
      <h2 id="legal-next-title">{t("ui.legal.next")}</h2>
      <ScrollReveal className="legal-next-grid">{NEXT_LINKS.map((item) => <Link key={item.href} href={item.href} className="legal-next-card" data-reveal><span className="legal-next-img"><Image src={item.image} alt="" fill sizes="(max-width: 760px) 90vw, 30vw" /></span><span className="legal-next-body"><strong>{t(item.title)}</strong><small>{t(item.text)}</small><ArrowUpRight size={18} aria-hidden="true" /></span></Link>)}</ScrollReveal>
    </section>
  </main>;
}
