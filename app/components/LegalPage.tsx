"use client";

import { ArrowUpRight, CheckCircle2, Cookie, FileText, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Link } from "./SiteLink";
import { useI18n } from "./I18n";
import { useSiteSettings } from "./SiteSettings";
import { OPEN_PRIVACY_SETTINGS_EVENT } from "./CookieConsent";

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
      {title:"Связь",text:"Если вы заметили неточность в характеристиках, правах на материал или работе сайта, сообщите ATADAN — мы проверим и при необходимости исправим публикацию."},
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
    privacy:{kicker:"Data protection",title:"Privacy policy",intro:"A plain-language explanation of what ATADAN receives, why it is needed and how to exercise your data rights.",updated:"Version dated 9 September 2026",blocks:[{title:"Data we receive",text:"When you submit a request, we collect only your name, phone, optional message, selected model and the consent record."},{title:"Purpose",text:"We use it to contact you, recommend equipment, prepare an offer and keep the interaction history in the CRM."},{title:"Analytics",text:"Analytics is off until you allow it. It records only the visited path, tractor model and a random identifier — never your name or phone."},{title:"Retention and access",text:"Only authorised ATADAN staff and necessary hosting providers have access. Data is retained only while needed for the request or required by applicable law."},{title:"Your rights",text:"You may request access, correction, restriction or deletion and withdraw optional consent by contacting ATADAN."},{title:"Legal approach",text:"The website follows the transparency, minimisation and storage-limitation principles of the Digital Code of the Kyrgyz Republic."}]},
    terms:{kicker:"Website rules",title:"Terms of use",intro:"Important conditions for understanding the catalogue, prices and calculations.",updated:"Version dated 9 September 2026",blocks:[{title:"Purpose",text:"The website presents Changfa equipment and ATADAN services. It is not an online store and accepts no payments."},{title:"Catalogue",text:"Specifications may vary by configuration and market. Final parameters are confirmed in the commercial offer or contract."},{title:"Financing",text:"The leasing calculator is an indicative example. A finance partner confirms the final terms."},{title:"Materials",text:"Changfa catalogue imagery links to manufacturer sources; other project visuals were supplied or created for ATADAN."}]},
    cookies:{kicker:"Browser settings",title:"Cookie policy",intro:"The site uses minimal local storage and contains no advertising trackers.",updated:"Version dated 9 September 2026",blocks:[{title:"Essential storage",text:"Used for language, privacy choice and protected staff sessions under /admin."},{title:"Analytics",text:"The random atadan_visitor key is created only after permission."},{title:"External services",text:"WhatsApp, Instagram, Changfa and the map open only after your action."},{title:"Change your choice",text:"Open cookie settings in the website footer at any time."}]},
  },
};

const icons = [ShieldCheck, LockKeyhole, CheckCircle2, FileText, Cookie, Mail];

export function LegalPage({ kind }: { kind: LegalKind }) {
  const { locale } = useI18n();
  const settings = useSiteSettings();
  const page = content[locale][kind];
  return <main className="legal-page">
    <section className="legal-hero"><div className="section-shell"><span>{page.kicker}</span><h1>{page.title}</h1><p>{page.intro}</p><small>{page.updated}</small></div></section>
    <section className="section-shell legal-layout">
      <aside><strong>ATADAN · Changfa</strong><p>{settings.address}<br/>{settings.phone}</p><nav><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Cookie</Link></nav></aside>
      <div className="legal-blocks">{page.blocks.map((block,index)=>{const Icon=icons[index%icons.length];return <article key={block.title}><i><Icon aria-hidden="true"/></i><div><span>{String(index+1).padStart(2,"0")}</span><h2>{block.title}</h2><p>{block.text}</p>{block.points?<ul>{block.points.map(point=><li key={point}>{point}</li>)}</ul>:null}</div></article>})}
        <div className="legal-contact"><div><strong>ATADAN</strong><p>{settings.phone} · {settings.address}</p></div>{kind==="cookies"?<button type="button" onClick={()=>window.dispatchEvent(new Event(OPEN_PRIVACY_SETTINGS_EVENT))}><Cookie aria-hidden="true"/>Настроить cookie</button>:<a href={`https://wa.me/${settings.phone.replace(/\D/g,"")}`} target="_blank" rel="noreferrer">Связаться <ArrowUpRight aria-hidden="true"/></a>}</div>
      </div>
    </section>
  </main>;
}
