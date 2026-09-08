import type { Locale, LocalizedText, NewsCategory, NewsPost } from "../types";

const text = (ru: string, ky: string, en: string): LocalizedText => ({ ru, ky, en });

export const newsCategoryLabels: Record<Locale, Record<NewsCategory, string>> = {
  ru: { selection: "Выбор трактора", technology: "Комфорт и технологии", field: "Техника в поле", service: "Сервис и запчасти", company: "Новости ATADAN" },
  ky: { selection: "Трактор тандоо", technology: "Комфорт жана технология", field: "Техника талаада", service: "Сервис жана тетиктер", company: "ATADAN жаңылыктары" },
  en: { selection: "Choosing a tractor", technology: "Comfort and technology", field: "Machinery in the field", service: "Service and parts", company: "ATADAN news" },
};

export const seedNews: NewsPost[] = [
  {
    slug: "kak-vybrat-traktor-po-ploshchadi", category: "selection", status: "published", featured: true,
    coverImage: "/images/news/journal-hero-4k.webp", gallery: ["/images/news/journal-hero-4k.webp", "/images/news/field-power-4k.webp", "/images/news/implements-4k.webp"],
    publishedAt: "2026-08-30", readingMinutes: 7, author: "Экспертная команда ATADAN", relatedTractorSlug: "cfg904-b", tags: ["мощность", "гектары", "выбор"],
    title: text("Как выбрать трактор по количеству гектаров", "Гектарга жараша тракторду кантип тандоо керек", "How to choose a tractor for your farm size"),
    excerpt: text("Площадь — только начало расчёта. Рельеф, почва и навесное оборудование определяют нужную мощность.", "Аянт — эсептин башталышы гана. Рельеф, топурак жана жабдуу керектүү кубатты аныктайт.", "Farm size is only the starting point. Terrain, soil and implements decide how much power you need."),
    content: text(
      `## Начинайте не с цифры, а с работы
Два хозяйства по 100 гектаров могут требовать разную технику. Сначала запишите основные операции: пахота, посев, культивация, перевозка и работа с валом отбора мощности.

## Учтите самое тяжёлое оборудование
Мощность выбирают под работу с наибольшей нагрузкой. Важны ширина и масса агрегата, гидравлика, глубина обработки и тип почвы. Передайте эти параметры менеджеру, чтобы сравнение моделей было предметным.

## Оставьте разумный запас
Трактор, который постоянно работает на пределе, оставляет мало свободы при сложной погоде. Небольшой запас помогает держать темп, но слишком большая машина повышает стоимость. Наша задача — найти середину.

## Используйте площадь как ориентир
До 30 гектаров чаще рассматривают манёвренные модели. Для смешанных хозяйств и регулярной обработки крупных полей нужен средний класс. Тяжёлая обработка и широкие агрегаты требуют старших серий. Окончательный выбор всегда делается по реальной работе.`,
      `## Санды эмес, ишти караңыз
100 гектар болгон эки чарбага ар башка техника керек болушу мүмкүн. Адегенде айдоо, себүү, культивация, ташуу жана кубат алуу валы менен иштөөнү жазыңыз.

## Эң оор жабдууну эске алыңыз
Кубат эң чоң жүк түшкөн ишке жараша тандалат. Агрегаттын туурасы, салмагы, гидравликасы, иш тереңдиги жана топурак маанилүү.

## Туура запас калтырыңыз
Дайыма чегинде иштеген трактор оор шартта темпти жоготот. Аз запас пайдалуу, бирок өтө чоң машина чыгымды көбөйтөт.

## Аянтты багыт катары колдонуңуз
30 гектарга чейин маневрдүү моделдер, чоң талаага орто класс, оор ишке жогорку сериялар каралат. Так тандоо чарбанын чыныгы жумушу боюнча жасалат.`,
      `## Start with the job, not a number
Two 100-hectare farms may need different machines. List the real work first: ploughing, seeding, cultivation, transport and PTO jobs.

## Check the hardest implement
Choose power around the highest load. Implement width and weight, hydraulic demand, working depth and soil type all matter.

## Keep a sensible reserve
A tractor working at its limit all day has little room for difficult conditions. A modest reserve protects the pace, while an oversized machine adds unnecessary cost.

## Use area as a guide
Smaller farms often start with agile models, larger mixed farms move into the middle range, and heavy tillage needs the upper series. Make the final choice around real work.`),
  },
  {
    slug: "moshchnost-dlya-pahoty", category: "selection", status: "published", featured: false,
    coverImage: "/images/news/field-power-4k.webp", gallery: ["/images/news/field-power-4k.webp", "/images/series/changfa-rear.webp"],
    publishedAt: "2026-08-28", readingMinutes: 6, author: "Экспертная команда ATADAN", relatedTractorSlug: "cfg1204-b", tags: ["пахота", "тяга", "почва"],
    title: text("Какая мощность нужна для пахоты", "Айдоо үчүн канча кубат керек", "How much power do you need for ploughing?"),
    excerpt: text("Плуг, глубина и влажность влияют на результат сильнее, чем одна цифра в паспорте.", "Соко, тереңдик жана нымдуулук паспорттогу бир сандан маанилүүрөөк.", "Plough, depth and soil moisture matter more than one brochure number."),
    content: text(
      `## Пахота показывает настоящую нагрузку
Трактору одновременно нужны тяга, устойчивость и правильная развесовка. Слишком широкий плуг вызывает пробуксовку, снижает скорость и повышает расход.

## Опишите условия поля
Назовите тип почвы, рабочую глубину и количество корпусов. После дождя или на плотном участке нагрузка заметно растёт.

## Мощность работает вместе с массой
Лошадиные силы сами по себе не гарантируют тягу. Важны шины, балласт, привод и настройка агрегата. Ровная борозда и стабильная глубина важнее лишнего километра в час.`,
      `## Айдоо чыныгы жүктү көрсөтөт
Тракторго тартуу күчү, туруктуулук жана туура салмак керек. Өтө чоң соко тайгаланууну жана күйүүчү майды көбөйтөт.

## Талаанын шартын айтыңыз
Топурактын түрү, тереңдик жана соконун корпус саны тандоого түз таасир берет. Нымдуу жерде жүк өсөт.

## Кубат салмак менен бирге иштейт
Ат күчү өзү эле тартууну кепилдебейт. Шина, балласт, привод жана агрегаттын жөндөөсү маанилүү.`,
      `## Ploughing reveals the real load
The tractor needs traction, stability and correct weight distribution. An oversized plough causes wheel slip, lower speed and higher fuel use.

## Describe the field
Soil type, working depth and number of plough bodies are more useful than farm area alone. Wet or dense ground raises the load.

## Power works with weight
Horsepower alone does not guarantee traction. Tyres, ballast, drive and implement setup matter. A clean furrow is more valuable than one extra kilometre per hour.`),
  },
  {
    slug: "changfa-90-ili-120", category: "selection", status: "published", featured: false,
    coverImage: "/images/about/changfa-field-4k.webp", gallery: ["/images/about/changfa-field-4k.webp", "/images/news/field-power-4k.webp"],
    publishedAt: "2026-08-26", readingMinutes: 6, author: "Экспертная команда ATADAN", relatedTractorSlug: "cfg904-b", tags: ["сравнение", "90 л.с.", "120 л.с."],
    title: text("Changfa 90 или 120 л.с.: понятное сравнение", "Changfa 90 же 120 а.к.: түшүнүктүү салыштыруу", "Changfa 90 vs 120 hp: a practical comparison"),
    excerpt: text("Когда достаточно манёвренных 90 л.с., а когда запас 120 л.с. экономит время в сезоне.", "Качан 90 а.к. жетиштүү, ал эми качан 120 а.к. убакыт үнөмдөйт.", "When agile 90 hp is enough and when 120 hp saves seasonal time."),
    content: text(
      `## 90 л.с. — универсальный рабочий класс
Этот диапазон подходит для транспорта, кормозаготовки, междурядья и умеренных агрегатов. Машина остаётся манёвренной, а владелец не платит за редко используемый запас.

## 120 л.с. — для плотного сезона
Дополнительная тяга полезна на тяжёлой почве, с широкими агрегатами и большим дневным объёмом. Она помогает удерживать рабочую скорость.

## Сравнивайте комплектацию
Масса, гидравлика, коробка, шины и навеска не менее важны, чем двигатель. Запишите три самые тяжёлые работы: если 90 л.с. закрывают их с запасом, переплачивать не нужно.`,
      `## 90 а.к. — универсалдуу класс
Бул кубат ташуу, тоют даярдоо, катар аралык жана орточо агрегаттар үчүн ылайыктуу. Трактор маневрдүү бойдон калат.

## 120 а.к. — тыгыз сезон үчүн
Оор топуракта, кең агрегатта жана чоң күндүк көлөмдө кошумча тартуу күчү темпти сактайт.

## Комплектацияны салыштырыңыз
Салмак, гидравлика, коробка, шина жана навеска кыймылдаткычтай эле маанилүү. Эң оор үч жумушту жазып, ошого жараша тандаңыз.`,
      `## 90 hp is a versatile working class
It suits transport, forage, row work and moderate implements while staying agile and economical.

## 120 hp supports a dense season
Extra traction helps on heavy soil, wider implements and high daily workloads, keeping the working pace stable.

## Compare the configuration
Weight, hydraulics, transmission, tyres and linkage matter as much as the engine. List the three hardest jobs and choose the smallest model that handles them with reserve.`),
  },
  {
    slug: "panoramnaya-kabina", category: "technology", status: "published", featured: false,
    coverImage: "/images/series/changfa-cabin-4k.webp", gallery: ["/images/series/changfa-cabin-4k.webp", "/images/hero/changfa-highway-4k.webp"],
    publishedAt: "2026-08-24", readingMinutes: 5, author: "Экспертная команда ATADAN", relatedTractorSlug: "cfj2004-g4", sourceUrl: "https://en.changfanz.com/archives/Tractor/15.html", tags: ["кабина", "обзор", "комфорт"],
    title: text("Почему панорамная кабина удобнее в работе", "Панорамалык кабина эмне үчүн ыңгайлуу", "Why a panoramic cab makes work easier"),
    excerpt: text("Хороший обзор — это меньше лишних поворотов корпуса, точнее работа и спокойнее смена.", "Жакшы көрүнүш — азыраак бурулуу, так иш жана тынч смена.", "Better visibility means fewer awkward turns, more precise work and a calmer shift."),
    content: text(
      `## Видеть поле, дорогу и агрегат
Большая площадь остекления помогает контролировать переднюю часть трактора, край поля и навесное оборудование. Водителю приходится меньше тянуться и поворачиваться.

## Меньше напряжения в конце дня
Когда рабочая зона сразу видна, человек дольше сохраняет естественную посадку и быстрее замечает отклонение от ряда.

## Камеры дополняют обзор
В старших комплектациях экран и круговые камеры помогают при маневрировании, но не заменяют зеркала и прямой обзор. Перед покупкой сядьте в кабину и настройте рабочее место под себя.`,
      `## Талааны жана агрегатты көрүү
Чоң айнектер трактордун алдындагы зонаны, талаанын четин жана жабдууну жакшы көрүүгө жардам берет. Айдоочу азыраак бурулат.

## Чыңалуу азаят
Иш аймагы дароо көрүнсө, адам туура отуруп, катаны эрте байкайт.

## Камера көрүнүштү толуктайт
Экран менен камера маневрде жардам берет, бирок күзгү жана түз көрүнүш дагы маанилүү. Сатып аларда кабинада өзүңүз отуруп көрүңүз.`,
      `## See the field, road and implement
Large glass areas help monitor the tractor nose, field edge and rear implement, reducing the need to twist and stretch.

## Less strain at the end of the day
When the work zone is immediately visible, the operator keeps a natural posture and notices deviations sooner.

## Cameras support direct vision
Higher configurations may add displays and surround cameras, but these do not replace mirrors. Test the seating position before choosing.`),
  },
  {
    slug: "horoshee-sidenie", category: "technology", status: "published", featured: false,
    coverImage: "/images/series/changfa-cabin-4k.webp", gallery: ["/images/series/changfa-cabin-4k.webp", "/images/news/journal-hero-4k.webp"],
    publishedAt: "2026-08-22", readingMinutes: 5, author: "Экспертная команда ATADAN", relatedTractorSlug: "cfj1804-g4", sourceUrl: "https://en.changfanz.com/archives/Tractor/15.html", tags: ["сиденье", "смена", "комфорт"],
    title: text("Как хорошее сиденье меняет длинную смену", "Жакшы отургуч узак сменаны кантип өзгөртөт", "How a good seat changes a long shift"),
    excerpt: text("Поле не станет ровнее, но правильная посадка помогает спине и рукам меньше уставать.", "Талаа түз болбойт, бирок туура отуруу чарчоону азайтат.", "The field stays rough, but correct seating reduces strain on the back and arms."),
    content: text(
      `## Комфорт начинается с настройки
Даже хорошее кресло не поможет, если водитель тянется к рулю или педалям. Настройте расстояние, высоту и поддержку так, чтобы плечи оставались расслабленными.

## Подвеска смягчает повторяющиеся удары
Она не отменяет аккуратную скорость на неровностях, но делает постоянные колебания менее утомительными.

## Управление должно быть рядом
Когда основные рычаги находятся в естественной зоне движения руки, водитель меньше наклоняется. И не забывайте о коротких перерывах: удобная кабина не заменяет отдых.`,
      `## Комфорт туура жөндөөдөн башталат
Айдоочу рулга же педалга созулса, жакшы кресло да жардам бербейт. Аралык менен бийиктикти ийин бош тургандай жөндөңүз.

## Подвеска силкинүүнү жумшартат
Ал туура ылдамдыкты алмаштырбайт, бирок кайталанган соккунун чарчоосун азайтат.

## Башкаруу жакын болсун
Рычагдар кол жеткен жерде болсо, айдоочу азыраак ийилет. Кыска тыныгуу да маанилүү.`,
      `## Comfort starts with adjustment
A good seat cannot help if the driver stretches for the wheel or pedals. Set distance, height and support so the shoulders stay relaxed.

## Suspension softens repeated shocks
It does not replace sensible speed on rough ground, but it makes constant movement less tiring.

## Keep controls within reach
Natural control placement reduces bending. Short breaks still matter: a comfortable cab does not replace rest.`),
  },
  {
    slug: "changfa-zimoy", category: "technology", status: "published", featured: false,
    coverImage: "/images/hero/changfa-highway-4k.webp", gallery: ["/images/hero/changfa-highway-4k.webp", "/images/series/changfa-engine-4k.webp"],
    publishedAt: "2026-08-20", readingMinutes: 6, author: "Сервисная команда ATADAN", relatedTractorSlug: "cfh1604-m", tags: ["зима", "запуск", "отопление"],
    title: text("Changfa зимой: запуск, обзор и тепло в кабине", "Changfa кышында: иштетүү, көрүнүш жана жылуулук", "Changfa in winter: starting, visibility and warmth"),
    excerpt: text("Что проверить до морозов, чтобы утром не искать причину плохого запуска и запотевших стёкол.", "Суукка чейин эмнени текшерүү керек: иштетүү жана айнек маселеси болбосун.", "What to check before frost so cold starts and misted windows do not stop the day."),
    content: text(
      `## Подготовьтесь до первого мороза
Проверьте аккумулятор, сезонное масло, охлаждающую жидкость и топливную систему. Слабое место, незаметное летом, зимой проявляется сразу.

## Не давайте полную нагрузку сразу
После запуска следуйте руководству модели и дайте системам стабилизироваться. Точное время зависит от температуры и применяемых жидкостей.

## Чистые стёкла — часть безопасности
Проверьте отопление, обдув, уплотнения дверей и стеклоочистители. Сухое хранение и заряженный аккумулятор заметно упрощают зимнее утро.`,
      `## Биринчи суукка чейин даярданыңыз
Аккумуляторду, сезондук майды, муздаткыч суюктукту жана отун системасын текшериңиз.

## Дароо толук жүк бербеңиз
Иштеткенден кийин моделдин нускамасын сактап, системалардын турукташуусун күтүңүз.

## Таза айнек — коопсуздук
Жылытуу, үйлөө, эшик резинасы жана айнек тазалагычты текшериңиз. Кургак сактоо кышкы ишти жеңилдетет.`,
      `## Prepare before the first frost
Check the battery, seasonal oil, coolant and fuel system. A weakness hidden in summer often appears immediately in winter.

## Do not apply full load immediately
Follow the model manual and allow systems to stabilise after starting. Exact timing depends on temperature and fluids.

## Clear glass is a safety feature
Check heating, demisting, door seals and wipers. Dry storage and a charged battery make winter mornings easier.`),
  },
  {
    slug: "predprodazhnaya-podgotovka", category: "company", status: "published", featured: false,
    coverImage: "/images/news/service-workshop-4k.webp", gallery: ["/images/news/service-workshop-4k.webp", "/images/series/changfa-engine-4k.webp"],
    publishedAt: "2026-08-18", readingMinutes: 5, author: "Сервисная команда ATADAN", relatedTractorSlug: "cfg1204-b", tags: ["ATADAN", "проверка", "передача"],
    title: text("Что входит в предпродажную подготовку ATADAN", "ATADAN сатууга чейинки даярдоодо эмнени текшерет", "What ATADAN checks before handover"),
    excerpt: text("Перед передачей важно проверить рабочие системы и спокойно объяснить управление владельцу.", "Берүүдөн мурда системаларды текшерип, башкарууну түшүндүрүү маанилүү.", "Before handover, working systems must be checked and controls explained clearly."),
    content: text(
      `## Внешний осмотр
Специалист проверяет крепления, шины, свет, зеркала, уровни жидкостей и отсутствие следов повреждений после транспортировки.

## Запуск и рабочие системы
Контролируются приборы, гидравлика, тормоза и основные органы управления. Конкретный перечень зависит от модели и комплектации.

## Передача знаний владельцу
Важно объяснить ежедневные проверки, безопасный запуск и интервалы обслуживания. Комплектация, документы и гарантийные условия подтверждаются до выдачи.`,
      `## Сырткы кароо
Адис бекитме, шина, жарык, күзгү, суюктук жана ташуудан кийинки абалды текшерет.

## Иштетүү жана системалар
Прибор, гидравлика, тормоз жана негизги башкаруу каралат. Тизме модель менен комплектацияга жараша.

## Ээсине түшүндүрүү
Күндөлүк текшерүү, коопсуз иштетүү жана сервис мөөнөтү түшүндүрүлөт. Документтер берүү алдында такталат.`,
      `## Exterior inspection
The team checks fasteners, tyres, lights, mirrors, fluid levels and signs of transport damage.

## Starting and working systems
Instruments, hydraulics, brakes and primary controls are checked. The exact list depends on model and configuration.

## Knowledge at handover
Daily checks, safe starting and service intervals are explained. Configuration, documents and warranty terms are confirmed before delivery.`),
  },
  {
    slug: "perviy-tehosmotr", category: "service", status: "published", featured: false,
    coverImage: "/images/news/service-workshop-4k.webp", gallery: ["/images/news/service-workshop-4k.webp", "/images/series/changfa-engine-4k.webp"],
    publishedAt: "2026-08-16", readingMinutes: 6, author: "Сервисная команда ATADAN", relatedTractorSlug: "cfe904-h", tags: ["техосмотр", "моточасы", "обслуживание"],
    title: text("Первый технический осмотр после покупки", "Сатып алгандан кийинки биринчи техникалык кароо", "The first technical inspection after purchase"),
    excerpt: text("Первые моточасы помогают вовремя заметить ослабшие крепления и проверить, как техника приработалась.", "Алгачкы мотосааттар техниканын ишке көнүшүн текшерүүгө жардам берет.", "The first operating hours help catch loose fasteners and confirm how the machine has settled in."),
    content: text(
      `## Первые часы — период наблюдения
Следите за необычными звуками, сообщениями панели, следами подтекания и изменением поведения органов управления.

## Проверяйте по руководству модели
Интервалы отличаются. Не переносите привычки со старого трактора автоматически — используйте рекомендации для конкретного Changfa.

## Не откладывайте мелочи
Ослабшее крепление проще проверить сразу. Записывайте моточасы и выполненные работы: короткий журнал помогает планировать расходники и сохраняет историю машины.`,
      `## Алгачкы сааттар — байкоо мезгили
Өзгөчө үн, панелдеги билдирүү, суюктук изи жана башкаруунун өзгөрүшүнө көңүл буруңуз.

## Моделдин нускамасын сактаңыз
Интервалдар ар башка. Эски трактордун адатын көчүрбөй, конкреттүү Changfa боюнча сунушту колдонуңуз.

## Майда белгини кечиктирбеңиз
Бошогон бекитмени дароо текшерүү оңой. Мотосаат жана иштерди журналга жазыңыз.`,
      `## The first hours are for observation
Watch for unusual sounds, dashboard messages, fluid traces or changes in control feel.

## Follow the model manual
Intervals differ. Do not automatically copy habits from an older tractor; use guidance for the specific Changfa.

## Do not postpone small signs
A loose fastener is easier to inspect immediately. Record hours and completed work to keep a clear service history.`),
  },
  {
    slug: "navesnoe-oborudovanie", category: "selection", status: "published", featured: false,
    coverImage: "/images/news/implements-4k.webp", gallery: ["/images/news/implements-4k.webp", "/images/series/changfa-rear.webp"],
    publishedAt: "2026-08-14", readingMinutes: 7, author: "Экспертная команда ATADAN", relatedTractorSlug: "cfe804-h", tags: ["навесное", "гидравлика", "ВОМ"],
    title: text("Как выбрать навесное оборудование для Changfa", "Changfa үчүн асма жабдууну кантип тандоо керек", "How to choose implements for a Changfa tractor"),
    excerpt: text("Вес, ширина, гидравлика и ВОМ должны подходить друг другу — иначе комплект работает хуже ожидаемого.", "Салмак, туурасы, гидравлика жана КАВ бири-бирине туура келиши керек.", "Weight, width, hydraulics and PTO must match for the combination to work well."),
    content: text(
      `## Начните с задачи
Определите культуру, рабочую ширину и желаемую дневную производительность. Для каждой операции требования будут разными.

## Проверьте четыре совместимости
Сопоставьте мощность, грузоподъёмность навески, гидравлику и параметры вала отбора мощности. Учтите массу агрегата в транспортном положении.

## Следите за развесовкой
Тяжёлое заднее оборудование может потребовать передний балласт. Лучший результат даёт не самый большой трактор, а правильно согласованная пара.`,
      `## Максаттан баштаңыз
Өсүмдүктү, иш туурасын жана күндүк көлөмдү аныктаңыз. Ар бир иштин талабы башка.

## Төрт шайкештикти текшериңиз
Кубат, навесканын көтөрүмдүүлүгү, гидравлика жана кубат алуу валынын параметрлерин салыштырыңыз.

## Салмак бөлүштүрүүнү караңыз
Оор арткы жабдуу алдыңкы балластты талап кылышы мүмкүн. Эң чоң эмес, туура шайкеш келген комплект жакшы иштейт.`,
      `## Begin with the job
Define the crop, working width and desired daily output. Every operation has different requirements.

## Check four kinds of compatibility
Match power, linkage lift capacity, hydraulic demand and PTO parameters. Include implement weight in transport position.

## Consider weight distribution
Heavy rear equipment may require front ballast. The best result comes from a properly matched pair, not simply the largest machine.`),
  },
  {
    slug: "itogi-pervogo-sezona", category: "field", status: "published", featured: false,
    coverImage: "/images/hero/changfa-lineup-4k.webp", gallery: ["/images/hero/changfa-lineup-4k.webp", "/images/news/journal-hero-4k.webp"],
    publishedAt: "2026-08-12", readingMinutes: 5, author: "Редакция ATADAN", relatedTractorSlug: "cfg1404-g4", tags: ["опыт", "поле", "Кыргызстан"],
    title: text("Как оценить трактор после первого сезона", "Биринчи сезондон кийин тракторду кантип баалоо керек", "How to evaluate a tractor after its first season"),
    excerpt: text("Не рекламный отзыв, а вопросы, которые показывают реальную пользу машины для хозяйства.", "Жарнама эмес, техниканын чыныгы пайдасын көрсөткөн суроолор.", "Not an advertisement, but the questions that reveal the machine’s real value."),
    content: text(
      `## Считайте выполненную работу
Успело ли хозяйство выполнить операции в нужные сроки? Запишите площадь, рабочие дни и причины простоев.

## Спросите водителя о смене
Комфорт понятен после нескольких длинных дней. Оцените обзор, посадку, доступ к рычагам и климат в кабине.

## Проверьте сервисный путь
Насколько просто получить фильтры, расходники и консультацию? Сравните ожидания с результатом и запишите, где потребовалась другая настройка.`,
      `## Аткарылган ишти эсептеңиз
Чарба иштерди өз убагында бүттүбү? Аянтты, иш күндөрүн жана токтоонун себептерин жазыңыз.

## Айдоочудан сураңыз
Комфорт узак күндөрдөн кийин билинет. Көрүнүш, отуруу, рычаг жана кабинадагы климатты баалаңыз.

## Сервисти текшериңиз
Фильтр, расходник жана кеңеш алуу канчалык оңой? Күтүү менен жыйынтыкты салыштырыңыз.`,
      `## Count the work completed
Did the farm finish operations on time? Record area covered, working days and causes of downtime.

## Ask the driver about the shift
Comfort becomes clear after long days. Judge visibility, seating, control reach and cab climate.

## Review the service path
How easy was it to get filters, consumables and advice? Compare expectations with results and note where setup changed.`),
  },
  {
    slug: "zapchasti-na-sezon", category: "service", status: "published", featured: false,
    coverImage: "/images/series/changfa-engine-4k.webp", gallery: ["/images/series/changfa-engine-4k.webp", "/images/news/service-workshop-4k.webp"],
    publishedAt: "2026-08-10", readingMinutes: 5, author: "Сервисная команда ATADAN", relatedTractorSlug: "cff1004-h", tags: ["запчасти", "расходники", "сезон"],
    title: text("Какие запчасти и расходники держать в хозяйстве", "Чарбада кайсы тетиктер жана расходниктер болушу керек", "Which parts and consumables should a farm keep?"),
    excerpt: text("Небольшой запас помогает не останавливать работу из-за фильтра, ремня или предохранителя.", "Кичине запас фильтр же ремень үчүн ишти токтотпоого жардам берет.", "A small stock can stop a filter, belt or fuse from interrupting field work."),
    content: text(
      `## Запас должен быть разумным
Держите то, что меняется по регламенту или может быстро потребоваться: подходящие фильтры, жидкости, ремни и предохранители согласно модели.

## Не покупайте по внешнему сходству
Похожие детали могут отличаться размером и характеристиками. Используйте модель, серийные данные и каталог.

## Храните правильно
Фильтры и электрика должны оставаться сухими, а жидкости — в закрытой таре. Перед сезоном уточните у ATADAN наличие расходников и срок поставки редких деталей.`,
      `## Запас акылга сыярлык болсун
Регламент менен алмашкан же тез керектелген фильтр, суюктук, ремень жана сактагычтарды модель боюнча кармаңыз.

## Сырткы окшоштук менен албаңыз
Окшош тетиктин өлчөмү башка болушу мүмкүн. Модель жана сериялык маалыматты колдонуңуз.

## Туура сактаңыз
Фильтр менен электрика кургак жерде, суюктук жабык идиште болсун. Сезонго чейин ATADAN менен бар-жогун тактаңыз.`,
      `## Keep a sensible stock
Keep scheduled or commonly needed items: correct filters, fluids, belts and fuses for the model.

## Do not buy by appearance alone
Similar-looking parts may differ in size and specification. Use model and serial information.

## Store them correctly
Keep filters and electrical parts dry and fluids sealed. Confirm availability and lead times with ATADAN before the season.`),
  },
  {
    slug: "rassrochka-na-traktor", category: "company", status: "published", featured: false,
    coverImage: "/images/banners/finance.webp", gallery: ["/images/banners/finance.webp", "/images/hero/changfa-lineup-4k.webp"],
    publishedAt: "2026-08-08", readingMinutes: 6, author: "Команда ATADAN", relatedTractorSlug: "cfg904-b", tags: ["лизинг", "бюджет", "экономика"],
    title: text("Как рассчитать покупку трактора в лизинг", "Тракторду лизингге алууну кантип эсептөө керек", "How to plan a tractor lease"),
    excerpt: text("Важны не только ежемесячный платёж, но и первый взнос, сезонность дохода и комплектация.", "Айлык төлөмдөн тышкары биринчи төлөм, сезондук киреше жана комплектация маанилүү.", "Deposit, seasonal income and configuration matter as much as the monthly payment."),
    content: text(
      `## Считайте полную стоимость проекта
Кроме трактора могут понадобиться навесное оборудование, доставка, регистрация и первый комплект расходников.

## Сопоставьте график с сезоном
Доход хозяйства неравномерен. Обсудите платежи с учётом продажи урожая и обязательных расходов.

## Оставьте рабочий резерв
Технике нужны топливо, обслуживание и водитель. Калькулятор на сайте даёт предварительный сценарий, а окончательные условия зависят от модели, комплектации и финансового партнёра.`,
      `## Толук бааны эсептеңиз
Трактордон тышкары жабдуу, жеткирүү, каттоо жана биринчи расходниктер керек болушу мүмкүн.

## Графикти сезонго ылайыктаңыз
Чарбанын кирешеси бирдей эмес. Түшүм сатуу жана милдеттүү чыгымдарды эске алыңыз.

## Иш резервин калтырыңыз
Күйүүчү май, сервис жана айдоочу үчүн каражат керек. Сайттагы эсеп алдын ала, акыркы шарт модель жана өнөктөшкө жараша.`,
      `## Count the full project cost
The tractor may also need implements, delivery, registration and an initial set of consumables.

## Match payments to the season
Farm income is uneven. Plan around harvest sales and essential operating expenses.

## Keep an operating reserve
Fuel, service and a driver still need funding. The website calculator is preliminary; final terms depend on model, configuration and the financing partner.`),
  },
];
