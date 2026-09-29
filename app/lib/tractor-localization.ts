import type { Locale, LocalizedText, Tractor } from "../types";

const text = (ru:string,ky:string,en:string):LocalizedText=>({ru,ky,en});

const labels:Record<string,LocalizedText>={
  "Габариты, мм":text("Габариты, мм","Өлчөмдөрү, мм","Dimensions, mm"),
  "Грузоподъёмность навески, кН":text("Грузоподъёмность навески, кН","Аспанын көтөрүмдүүлүгү, кН","Hitch lift capacity, kN"),
  "Дорожный просвет, мм":text("Дорожный просвет, мм","Жол жарыгы, мм","Ground clearance, mm"),
  "Задние шины":text("Задние шины","Арткы шиналар","Rear tyres"),
  "Колёсная база, мм":text("Колёсная база, мм","Дөңгөлөк базасы, мм","Wheelbase, mm"),
  "Колея задних колёс, мм":text("Колея задних колёс, мм","Арткы дөңгөлөктөрдүн изи, мм","Rear wheel track, mm"),
  "Колея передних колёс, мм":text("Колея передних колёс, мм","Алдыңкы дөңгөлөктөрдүн изи, мм","Front wheel track, mm"),
  "Коробка передач":text("Коробка передач","Берүүлөр кутусу","Transmission"),
  "Минимальная масса, кг":text("Минимальная масса, кг","Минималдуу салмак, кг","Minimum weight, kg"),
  "Модель двигателя":text("Модель двигателя","Кыймылдаткыч модели","Engine model"),
  "Номинальная мощность, кВт":text("Номинальная мощность, кВт","Номиналдык кубаттуулук, кВт","Rated power, kW"),
  "Номинальное тяговое усилие, кН":text("Номинальное тяговое усилие, кН","Номиналдык тартуу күчү, кН","Rated traction force, kN"),
  "Номинальные обороты, об/мин":text("Номинальные обороты, об/мин","Номиналдык айлануу, айл/мин","Rated speed, rpm"),
  "Передние шины":text("Передние шины","Алдыңкы шиналар","Front tyres"),
  "Скорость ВОМ, об/мин":text("Скорость ВОМ, об/мин","КЧВ ылдамдыгы, айл/мин","PTO speed, rpm"),
  "Скорость движения, км/ч":text("Скорость движения, км/ч","Жүрүү ылдамдыгы, км/саат","Travel speed, km/h"),
  "Сцепление":text("Сцепление","Муфта","Clutch"),
  "Тип двигателя":text("Тип двигателя","Кыймылдаткыч түрү","Engine type"),
  "Тормоза":text("Тормоза","Тормоздор","Brakes"),
};

const categories:Record<string,LocalizedText>={
  "Универсальные":text("Универсальные","Универсалдуу","Utility"),
  "Средний класс":text("Средний класс","Орто класс","Mid-range"),
  "Тяжёлый класс":text("Тяжёлый класс","Оор класс","Heavy-duty"),
};

const areas:Record<string,LocalizedText>={
  "до 30 га":text("до 30 га","30 га чейин","up to 30 ha"),
  "20–60 га":text("20–60 га","20–60 га","20–60 ha"),
  "40–120 га":text("40–120 га","40–120 га","40–120 ha"),
  "80–250 га":text("80–250 га","80–250 га","80–250 ha"),
  "150–400 га":text("150–400 га","150–400 га","150–400 ha"),
  "от 250 га":text("от 250 га","250 га жогору","from 250 ha"),
};

const comforts:Record<string,LocalizedText>={
  "Простое управление, хорошая обзорность и удобная посадка":text("Простое управление, хорошая обзорность и удобная посадка","Жөнөкөй башкаруу, жакшы көрүнүш жана ыңгайлуу отуруу","Simple controls, good visibility and a comfortable seating position"),
  "Комфортная кабина, широкий обзор и удобное управление":text("Комфортная кабина, широкий обзор и удобное управление","Ыңгайлуу кабина, кең көрүнүш жана ыңгайлуу башкаруу","Comfortable cab, wide visibility and convenient controls"),
  "Просторная кабина, климат-контроль и эргономичное рабочее место":text("Просторная кабина, климат-контроль и эргономичное рабочее место","Кең кабина, климат-контроль жана эргономикалык жумуш орду","Spacious cab, climate control and an ergonomic workstation"),
};

const technical:Record<Exclude<Locale,"en">,Array<[RegExp,string]>>={
  ru:[
    [/In-line/gi,"рядный"],[/water-cooled/gi,"с жидкостным охлаждением"],[/four-stroke/gi,"четырёхтактный"],[/direct injection/gi,"непосредственный впрыск"],
    [/Dry type/gi,"сухого типа"],[/\bDry\b/gi,"сухое"],[/Oil bath/gi,"в масляной ванне"],[/\bWet\b/gi,"мокрые"],[/single[- ]piece/gi,"однодисковое"],[/double disc type/gi,"двухдисковое"],[/four-plate/gi,"четырёхдисковые"],
    [/normally engaged/gi,"постоянно замкнутое"],[/always engaged/gi,"постоянно замкнутое"],[/double[- ]acting(?: clutch)?/gi,"двойного действия"],[/independently operated/gi,"независимого управления"],
    [/Combination type/gi,"комбинированного типа"],[/configuration/gi,"компоновка"],[/combination/gi,"комбинация"],[/clutch sleeve shift/gi,"переключение муфтой"],[/clutch shift/gi,"переключение муфтой"],[/gear shifting/gi,"механическое переключение"],[/synchronizer shifting?/gi,"синхронизированное переключение"],[/shuttle gear/gi,"реверсивная передача"],[/main and auxiliary speed/gi,"основной и дополнительный диапазон"],[/main transmission/gi,"основная трансмиссия"],[/helical gear/gi,"косозубая передача"],[/spur gear/gi,"прямозубая передача"],[/meshing sleeve shift/gi,"переключение зубчатой муфтой"],
    [/disc brakes?/gi,"дисковые тормоза"],[/shoe type/gi,"колодочного типа"],[/manual hydraulic operation/gi,"ручное гидравлическое управление"],[/manual hydraulic or hydraulic power-assisted/gi,"ручное гидравлическое управление или гидроусилитель"],[/hydraulically assisted/gi,"с гидроусилителем"],[/mechanical operation/gi,"механическое управление"],
    [/Optional crawler gear/gi,"Опциональная пониженная передача"],[/optional creeping/gi,"Опциональный ходоуменьшитель"],[/crawler gear/gi,"пониженная передача"],[/crawler/gi,"пониженный диапазон"],[/Conventional/gi,"Основной диапазон"],[/Normal/gi,"Обычный диапазон"],[/High speed/gi,"Повышенный диапазон"],[/Forward:?/gi,"Вперёд:"],[/Backward:?/gi,"Назад:"],[/Reverse:?/gi,"Назад:"],
    [/optional/gi,"опционально"],[/commonly used/gi,"стандарт"],[/usually used/gi,"стандарт"],[/\bcommon\b/gi,"стандарт"],[/\bgears\b/gi,"передач"],
    [/to the top of the safety (?:frame|rack)/gi,"до верха дуги безопасности"],[/Safety frame/gi,"дуга безопасности"],[/safety frame/gi,"дуга безопасности"],[/to the top of the (?:cab|Driver's cab)/gi,"до верха кабины"],[/Driver's cab/gi,"кабина"],[/\bcab\b/gi,"кабина"],[/to the top of the air filter/gi,"до верха воздухоочистителя"],
    [/front drive axle middle oil drain bolt/gi,"сливная пробка в середине переднего ведущего моста"],[/front axle middle oil drain bolt/gi,"сливная пробка в середине переднего моста"],[/front axle oil drain bolt/gi,"сливная пробка переднего моста"],[/drain bolt in the middle of the front axle/gi,"сливная пробка в середине переднего моста"],[/lower end of front axle steering oil bolt/gi,"нижняя точка пробки рулевого механизма переднего моста"],[/center bottom of front axle/gi,"нижняя центральная точка переднего моста"],[/trailer side panel/gi,"борт прицепа"],
  ],
  ky:[
    [/In-line/gi,"катарлуу"],[/water-cooled/gi,"суу менен муздатылган"],[/four-stroke/gi,"төрт тактылуу"],[/direct injection/gi,"түз бүркүү"],
    [/Dry type/gi,"кургак түрү"],[/\bDry\b/gi,"кургак"],[/Oil bath/gi,"май ваннасында"],[/\bWet\b/gi,"нымдуу"],[/single[- ]piece/gi,"бир дисктүү"],[/double disc type/gi,"эки дисктүү"],[/four-plate/gi,"төрт дисктүү"],
    [/normally engaged/gi,"дайыма кошулган"],[/always engaged/gi,"дайыма кошулган"],[/double[- ]acting(?: clutch)?/gi,"эки аракеттүү"],[/independently operated/gi,"өз алдынча башкарылуучу"],
    [/Combination type/gi,"айкалышкан түрү"],[/configuration/gi,"түзүлүш"],[/combination/gi,"айкалыш"],[/clutch sleeve shift/gi,"муфта менен которуу"],[/clutch shift/gi,"муфта менен которуу"],[/gear shifting/gi,"механикалык которуу"],[/synchronizer shifting?/gi,"синхронизатор менен которуу"],[/shuttle gear/gi,"реверстүү берүү"],[/main and auxiliary speed/gi,"негизги жана кошумча диапазон"],[/main transmission/gi,"негизги трансмиссия"],[/helical gear/gi,"кыйгач тиштүү берүү"],[/spur gear/gi,"түз тиштүү берүү"],[/meshing sleeve shift/gi,"тиш муфтасы менен которуу"],
    [/disc brakes?/gi,"дисктүү тормоздор"],[/shoe type/gi,"колодкалуу түрү"],[/manual hydraulic operation/gi,"кол гидравликалык башкаруу"],[/manual hydraulic or hydraulic power-assisted/gi,"кол гидравликалык башкаруу же гидрокүчөткүч"],[/hydraulically assisted/gi,"гидрокүчөткүчтүү"],[/mechanical operation/gi,"механикалык башкаруу"],
    [/Optional crawler gear/gi,"Тандоо боюнча төмөндөтүлгөн берүү"],[/optional creeping/gi,"Тандоо боюнча жай жүрүш"],[/crawler gear/gi,"төмөндөтүлгөн берүү"],[/crawler/gi,"төмөндөтүлгөн диапазон"],[/Conventional/gi,"Негизги диапазон"],[/Normal/gi,"Кадимки диапазон"],[/High speed/gi,"Жогорку диапазон"],[/Forward:?/gi,"Алга:"],[/Backward:?/gi,"Артка:"],[/Reverse:?/gi,"Артка:"],
    [/optional/gi,"тандоо боюнча"],[/commonly used/gi,"стандарт"],[/usually used/gi,"стандарт"],[/\bcommon\b/gi,"стандарт"],[/\bgears\b/gi,"берүү"],
    [/to the top of the safety (?:frame|rack)/gi,"коопсуздук дугасынын үстүнө чейин"],[/Safety frame/gi,"коопсуздук дугасы"],[/safety frame/gi,"коопсуздук дугасы"],[/to the top of the (?:cab|Driver's cab)/gi,"кабинанын үстүнө чейин"],[/Driver's cab/gi,"кабина"],[/\bcab\b/gi,"кабина"],[/to the top of the air filter/gi,"аба тазалагычтын үстүнө чейин"],
    [/front drive axle middle oil drain bolt/gi,"алдыңкы жетектөөчү көпүрөнүн ортосундагы май төгүүчү тыгын"],[/front axle middle oil drain bolt/gi,"алдыңкы көпүрөнүн ортосундагы май төгүүчү тыгын"],[/front axle oil drain bolt/gi,"алдыңкы көпүрөнүн май төгүүчү тыгыны"],[/drain bolt in the middle of the front axle/gi,"алдыңкы көпүрөнүн ортосундагы төгүүчү тыгын"],[/lower end of front axle steering oil bolt/gi,"алдыңкы көпүрөнүн рулдук май тыгынынын төмөнкү чекити"],[/center bottom of front axle/gi,"алдыңкы көпүрөнүн төмөнкү борбору"],[/trailer side panel/gi,"чиркегичтин борту"],
  ],
};

function normalizeTechnical(value:string){
  return value.replaceAll("、",", ").replaceAll("，",", ").replace(/\(常用\)/g,"(standard)").replace(/常用/g,"standard").replace(/选装/g," optional ").replace(/\s+/g," ").trim();
}

export function localizeTechnicalValue(value:string,locale:Locale){
  let localized=normalizeTechnical(value);
  if(locale==="en")return localized;
  for(const [pattern,replacement] of technical[locale])localized=localized.replace(pattern,replacement);
  return localized.replace(/standard/gi,"стандарт").replace(/\s+,/g,",").replace(/\s{2,}/g," ").trim();
}

export function localizeSpecs(specs:Record<string,string>,locale:Locale){
  return Object.entries(specs).map(([label,value])=>[labels[label]?.[locale]??label,localizeTechnicalValue(value,locale)] as const);
}

export function localizeTractor(tractor:Tractor,locale:Locale){
  const description:LocalizedText={
    ru:tractor.description,
    ky:`${tractor.model}: ${tractor.hp} а.к. кубаттуулуктагы толук жетектүү Changfa трактору; талаада, чарбада жана асма жабдуу менен туруктуу иштөөгө арналган.`,
    en:`${tractor.model}: a ${tractor.hp} hp four-wheel-drive Changfa tractor for steady work in the field, around the farm and with implements.`,
  };
  return {
    category:categories[tractor.category]?.[locale]??tractor.category,
    farmArea:areas[tractor.farmArea]?.[locale]??tractor.farmArea,
    description:description[locale]||tractor.description,
    comfort:comforts[tractor.comfort]?.[locale]??tractor.comfort,
    specs:localizeSpecs(tractor.specs,locale),
  };
}
