import type { Metadata } from "next";
import type { Locale, LocalizedText } from "../types";
import { localizedPath } from "./i18n-routing";

export const SITE_URL="https://atadan-changfa.vercel.app";
export const FALLBACK_IMAGE="/images/hero/atadan-field-wide.png";

const localeTag:Record<Locale,string>={ru:"ru_KG",ky:"ky_KG",en:"en_US"};

export type PublicMetadataInput={path:string;locale:Locale;title:string;description:string;image?:string|null;type?:"website"|"article";publishedTime?:string};

export function languageAlternates(path:string){
  return {
    "ru-KG":localizedPath(path,"ru"),
    "ky-KG":localizedPath(path,"ky"),
    en:localizedPath(path,"en"),
    "x-default":localizedPath(path,"ru"),
  };
}

export function publicMetadata({path,locale,title,description,image,type="website",publishedTime}:PublicMetadataInput):Metadata{
  const canonical=localizedPath(path,locale);
  const socialImage=image||FALLBACK_IMAGE;
  return {
    title,
    description,
    robots:{index:true,follow:true},
    alternates:{canonical,languages:languageAlternates(path)},
    openGraph:{title,description,url:canonical,siteName:"ATADAN",type,locale:localeTag[locale],images:[{url:socialImage,alt:title}],...(type==="article"&&publishedTime?{publishedTime}:{})},
    twitter:{card:"summary_large_image",title,description,images:[socialImage]},
  };
}

type PageKey="home"|"catalog"|"service"|"finance"|"news"|"about"|"contacts"|"privacy"|"terms"|"cookies";
type PageCopy={title:LocalizedText;description:LocalizedText;image:string};
export const publicPageCopy:Record<PageKey,PageCopy>={
  home:{title:{ru:"ATADAN: тракторы Changfa в Кыргызстане",ky:"ATADAN: Кыргызстандагы Changfa тракторлору",en:"ATADAN: Changfa tractors in Kyrgyzstan"},description:{ru:"Каталог тракторов Changfa, подбор модели, финансирование, новости и сервис ATADAN в Кыргызстане.",ky:"Changfa тракторлорунун каталогу, модель тандоо, каржылоо, жаңылыктар жана Кыргызстандагы ATADAN сервиси.",en:"Changfa tractor catalogue, model selection, financing, news and ATADAN service in Kyrgyzstan."},image:FALLBACK_IMAGE},
  catalog:{title:{ru:"Каталог тракторов Changfa | ATADAN",ky:"Changfa тракторлорунун каталогу | ATADAN",en:"Changfa tractor catalogue | ATADAN"},description:{ru:"Модели тракторов Changfa с характеристиками и актуальным наличием по складским VIN.",ky:"Changfa трактор моделдери: мүнөздөмөлөр жана кампадагы VIN боюнча актуалдуу жеткиликтүүлүк.",en:"Changfa tractor models with specifications and current availability based on warehouse VIN records."},image:"/images/banners/catalog.webp"},
  service:{title:{ru:"Сервис тракторов Changfa | ATADAN",ky:"Changfa тракторлорунун сервиси | ATADAN",en:"Changfa tractor service | ATADAN"},description:{ru:"Поддержка, регламентное обслуживание и диагностика тракторов Changfa.",ky:"Changfa тракторлорун колдоо, пландуу тейлөө жана диагностикалоо.",en:"Support, scheduled maintenance and diagnostics for Changfa tractors."},image:"/images/banners/service.webp"},
  finance:{title:{ru:"Финансирование тракторов Changfa | ATADAN",ky:"Changfa тракторлорун каржылоо | ATADAN",en:"Changfa tractor financing | ATADAN"},description:{ru:"Предварительный расчёт финансирования тракторов Changfa с графиком платежей.",ky:"Changfa тракторлорун каржылоонун төлөм графиги менен алдын ала эсеби.",en:"Preliminary Changfa tractor financing estimate with a payment schedule."},image:"/images/banners/finance.webp"},
  news:{title:{ru:"Новости и материалы ATADAN",ky:"ATADAN жаңылыктары жана материалдары",en:"ATADAN news and articles"},description:{ru:"Опубликованные материалы ATADAN о тракторах Changfa, эксплуатации и работе техники.",ky:"Changfa тракторлору, пайдалануу жана техниканын иши жөнүндө ATADAN материалдары.",en:"Published ATADAN articles about Changfa tractors, operation and machinery at work."},image:"/images/news/journal-hero-4k.webp"},
  about:{title:{ru:"О компании ATADAN",ky:"ATADAN компаниясы жөнүндө",en:"About ATADAN"},description:{ru:"История, подход к работе и команда ATADAN в Кыргызстане.",ky:"Кыргызстандагы ATADAN компаниясынын тарыхы, иштөө ыкмасы жана командасы.",en:"The story, working approach and team of ATADAN in Kyrgyzstan."},image:"/images/banners/about.webp"},
  contacts:{title:{ru:"Контакты ATADAN",ky:"ATADAN байланыштары",en:"ATADAN contacts"},description:{ru:"Телефон, адрес и форма связи с командой ATADAN в Кыргызстане.",ky:"Кыргызстандагы ATADAN командасынын телефону, дареги жана байланыш формасы.",en:"Phone, address and contact form for the ATADAN team in Kyrgyzstan."},image:"/images/banners/contacts.webp"},
  privacy:{title:{ru:"Политика конфиденциальности | ATADAN",ky:"Купуялык саясаты | ATADAN",en:"Privacy policy | ATADAN"},description:{ru:"Как ATADAN обрабатывает данные заявок и аналитику сайта.",ky:"ATADAN өтүнмө маалыматтарын жана сайт аналитикасын кантип иштетет.",en:"How ATADAN handles enquiry data and website analytics."},image:FALLBACK_IMAGE},
  terms:{title:{ru:"Условия использования | ATADAN",ky:"Колдонуу шарттары | ATADAN",en:"Terms of use | ATADAN"},description:{ru:"Условия использования каталога и публичных сервисов ATADAN.",ky:"ATADAN каталогун жана ачык сервистерин колдонуу шарттары.",en:"Terms for using the ATADAN catalogue and public services."},image:FALLBACK_IMAGE},
  cookies:{title:{ru:"Политика cookie | ATADAN",ky:"Cookie саясаты | ATADAN",en:"Cookie policy | ATADAN"},description:{ru:"Настройки cookie и управление аналитикой на сайте ATADAN.",ky:"ATADAN сайтындагы cookie жөндөөлөрү жана аналитиканы башкаруу.",en:"Cookie settings and analytics controls on the ATADAN website."},image:FALLBACK_IMAGE},
};

export function pageMetadata(key:PageKey,path:string,locale:Locale){
  const value=publicPageCopy[key];
  return publicMetadata({path,locale,title:value.title[locale],description:value.description[locale],image:value.image});
}

export function jsonLd(value:unknown){
  return JSON.stringify(value).replace(/</g,"\\u003c");
}
