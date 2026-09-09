"use client";

import { ArrowUpRight, MapPin, Navigation } from "lucide-react";
import { useState } from "react";
import { useI18n } from "./I18n";
import { useSiteSettings } from "./SiteSettings";

const labels={
  ru:{kicker:"Приезжайте в ATADAN",title:"Покажем технику и ответим на вопросы",text:"Бишкек, улица Шевченко, 114. Перед приездом позвоните — подготовим нужную модель и специалиста.",show:"Показать интерактивную карту",external:"Карта загрузится с OpenStreetMap только после нажатия.",route:"Построить маршрут"},
  ky:{kicker:"ATADANга келиңиз",title:"Техниканы көрсөтүп, суроолорго жооп беребиз",text:"Бишкек, Шевченко көчөсү, 114. Келерден мурун чалыңыз.",show:"Интерактивдүү картаны көрсөтүү",external:"Карта OpenStreetMapтан баскандан кийин гана жүктөлөт.",route:"Маршрут түзүү"},
  en:{kicker:"Visit ATADAN",title:"See the machinery and talk to a specialist",text:"114 Shevchenko Street, Bishkek. Call before visiting so we can prepare the right model and specialist.",show:"Show interactive map",external:"The OpenStreetMap frame loads only after you click.",route:"Get directions"},
} as const;

export function OfficeMap(){
  const {locale}=useI18n();const l=labels[locale];const settings=useSiteSettings();const [loaded,setLoaded]=useState(false);
  const directions="https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;42.880964%2C74.583130";
  return <section className="section-shell office-map-section"><div className="office-map-copy"><span className="section-label">{l.kicker}</span><h2>{l.title}</h2><p>{l.text}</p><a href={directions} target="_blank" rel="noreferrer"><Navigation aria-hidden="true"/>{l.route}<ArrowUpRight aria-hidden="true"/></a><small>{settings.address} · {settings.phone}</small></div><div className={`office-map ${loaded?"is-loaded":""}`}>{loaded?<iframe title="Карта офиса ATADAN" loading="lazy" referrerPolicy="no-referrer" src="https://www.openstreetmap.org/export/embed.html?bbox=74.57313%2C42.875964%2C74.59313%2C42.885964&layer=mapnik&marker=42.880964%2C74.583130"/>:<button type="button" onClick={()=>setLoaded(true)}><span className="map-grid" aria-hidden="true"/><i><MapPin aria-hidden="true"/></i><strong>{l.show}</strong><small>{l.external}</small></button>}</div></section>;
}
