export const localize = (value, lang = 'ru') => {
  if (value == null) return ''
  if (typeof value !== 'object' || Array.isArray(value)) return value
  return value[lang] ?? value.ru ?? Object.values(value)[0] ?? ''
}

const explanation = {
  power: {
    ru: 'Показывает, насколько тяжёлую работу может выполнять трактор. Чем больше число, тем больше и тяжелее оборудование он способен тянуть.',
    ky: 'Трактор канчалык оор жумуш аткара аларын көрсөтөт. Сан чоң болгон сайын оор жабдууну сүйрөй алат.',
    en: 'Shows how much heavy work the tractor can handle. A higher number means it can pull larger and heavier implements.',
    'zh-CN': '表示拖拉机能够承担多重的作业。数值越大，可牵引的农具通常越大、越重。'
  },
  creeper: {
    ru: 'Позволяет ехать очень медленно, но сохранять тягу. Полезно для точных и тяжёлых работ.',
    ky: 'Өтө жай жүрүп, тартуу күчүн сактоого жардам берет. Так жана оор жумуштарга ыңгайлуу.',
    en: 'Lets the tractor move very slowly while keeping pulling force. Useful for precise and heavy operations.',
    'zh-CN': '可在保持牵引力的同时低速行驶，适合精细作业和重载作业。'
  },
  gearbox: {
    ru: 'Помогает выбрать режим: медленно и мощно в поле или быстрее при перевозке.',
    ky: 'Талаада жай жана күчтүү, жолдо ылдамыраак режимди тандоого жардам берет.',
    en: 'Lets the operator choose between slow, powerful field work and faster transport.',
    'zh-CN': '可选择低速大扭矩田间作业或较快的运输速度。'
  },
  wheelbase: {
    ru: 'Расстояние между передней и задней осью. Влияет на устойчивость, манёвренность и плавность хода.',
    ky: 'Алдыңкы жана арткы октун аралыгы. Туруктуулукка жана бурулушка таасир берет.',
    en: 'Distance between front and rear axles. It affects stability, turning and ride comfort.',
    'zh-CN': '前后桥之间的距离，会影响稳定性、转向灵活性和行驶舒适性。'
  },
  mass: {
    ru: 'Тяжёлый трактор лучше передаёт тягу на землю, но требует учитывать почву и транспортировку.',
    ky: 'Оор трактор күчтү жерге жакшы өткөрөт, бирок топурак менен ташууну эске алуу керек.',
    en: 'A heavier tractor transfers pulling force to the ground better, but soil and transport must be considered.',
    'zh-CN': '较重的拖拉机能更好地将牵引力传到地面，但也要考虑土壤和运输条件。'
  },
  track: {
    ru: 'Ширину колеи можно менять под разные междурядья и условия работы.',
    ky: 'Дөңгөлөктөрдүн аралыгын ар башка катарларга жана жумушка ылайык өзгөртүүгө болот.',
    en: 'The wheel track can be adjusted for different row spacing and work conditions.',
    'zh-CN': '轮距可根据不同作物行距和作业条件进行调整。'
  },
  pto: {
    ru: 'Вращающийся вал сзади передаёт мощность косилке, фрезе, пресс-подборщику и другому оборудованию.',
    ky: 'Артындагы айлануучу вал чөп чапкычка, фрезага жана башка жабдууга күч берет.',
    en: 'The rotating rear shaft powers mowers, tillers, balers and other implements.',
    'zh-CN': '后部旋转动力轴为割草机、旋耕机、打捆机等农具提供动力。'
  },
  lift: {
    ru: 'Показывает, какой вес навесного оборудования трактор способен поднять сзади.',
    ky: 'Трактор артындагы жабдуунун канча салмагын көтөрө аларын көрсөтөт.',
    en: 'Shows how much rear-mounted equipment the tractor can lift.',
    'zh-CN': '表示后悬挂系统能够提升多重的农具。'
  }
}

const common = {
  availability: 'in-stock',
  leasing: true,
  drive: '4×4',
  cabin: true,
  trackAdjustable: true,
  price: null,
  note: {
    ru: 'Точная комплектация и характеристики подтверждаются менеджером перед оформлением заказа.',
    ky: 'Так комплектациясы жана мүнөздөмөлөрү заказ берүү алдында менеджер менен такталат.',
    en: 'The exact specification and configuration are confirmed by a manager before the order.',
    'zh-CN': '具体配置和技术参数须在下单前由经理确认。'
  }
}

export const tractors = [
  {
    ...common,
    slug: 'changfa-cff904', model: 'CHANGFA CFF904', series: 'F', power: 90,
    image: '/images/tractors/cff904.webp', thumb: '/images/tractors/cff904-thumb.webp', imageWidth:419, imageHeight:370, thumbWidth:419, thumbHeight:370,
    mass: 4400, wheelbase: 2334, gears: '24F / 24R', creeper: true,
    speed: '0,26–38,28 км/ч',
    jobs: ['small-farm','transport','cultivation','loader'],
    tagline: {ru:'Манёвренный трактор для небольших и средних хозяйств',ky:'Чакан жана орто чарбалар үчүн ыңгайлуу трактор',en:'Agile tractor for small and medium farms','zh-CN':'适合中小型农场的灵活拖拉机'},
    description: {ru:'Подходит для повседневных работ: культивации, посева, перевозки и работы с фронтальным погрузчиком.',ky:'Культивация, себүү, ташуу жана жүктөгүч менен иштөө үчүн ылайыктуу.',en:'Suitable for daily cultivation, seeding, transport and front-loader work.','zh-CN':'适合日常耕作、播种、运输和前装载作业。'},
    recommendedFor: {ru:'Хозяйства, которым нужен универсальный трактор без лишней массы.',ky:'Ашыкча оор эмес, универсалдуу трактор керек болгон чарбалар.',en:'Farms that need a versatile tractor without excessive weight.','zh-CN':'需要通用型且不过度笨重设备的农场。'},
    specs: [
      ['Мощность','90 л.с.',explanation.power],['Ходоуменьшитель','Есть',explanation.creeper],['Коробка передач','24 вперёд / 24 назад',explanation.gearbox],['Колёсная база','2334 мм',explanation.wheelbase],['Масса','около 4400 кг',explanation.mass],['Регулировка колеи','Передняя и задняя',explanation.track]
    ]
  },
  {
    ...common,
    slug: 'changfa-cff1204', model: 'CHANGFA CFF1204', series: 'F', power: 120,
    image: '/images/tractors/cff1204.webp', thumb: '/images/tractors/cff1204-thumb.webp', imageWidth:411, imageHeight:364, thumbWidth:411, thumbHeight:364,
    mass: 4400, wheelbase: 2334, gears: '24F / 24R', creeper: true, speed: '0,26–38,28 км/ч',
    jobs: ['plowing','seeding','transport','universal'],
    tagline: {ru:'Популярный баланс мощности, массы и расхода',ky:'Күч, салмак жана чыгымдын жакшы тең салмагы',en:'A popular balance of power, weight and fuel use','zh-CN':'动力、重量与油耗之间的热门平衡'},
    description: {ru:'Универсальная модель для пахоты, посева, культивации и перевозки. Подходит хозяйствам, которые переходят на современную технику.',ky:'Айдоо, себүү, культивация жана ташуу үчүн универсалдуу модель.',en:'A versatile model for plowing, seeding, cultivation and transport.','zh-CN':'适用于犁耕、播种、耕作和运输的通用机型。'},
    recommendedFor: {ru:'Средние хозяйства и подрядчики, которым нужен один трактор для разных сезонов.',ky:'Ар башка мезгилде бир трактор колдонгон орто чарбалар жана кызмат көрсөтүүчүлөр.',en:'Medium farms and contractors needing one tractor across seasons.','zh-CN':'需要一台设备覆盖多个农忙季节的中型农场和作业服务商。'},
    specs: [
      ['Мощность','120 л.с.',explanation.power],['Ходоуменьшитель','Есть',explanation.creeper],['Коробка передач','24 вперёд / 24 назад',explanation.gearbox],['Колёсная база','2334 мм',explanation.wheelbase],['Масса','около 4400 кг',explanation.mass],['Регулировка колеи','Передняя и задняя',explanation.track]
    ]
  },
  {
    ...common,
    slug: 'changfa-cfg1404', model: 'CHANGFA CFG1404', series: 'G', power: 140,
    image: '/images/tractors/cfg1404.webp', thumb: '/images/tractors/cfg1404-thumb.webp', imageWidth:422, imageHeight:347, thumbWidth:422, thumbHeight:347,
    mass: 4800, wheelbase: 2334, gears: '24F / 24R', creeper: true, speed: '0,26–38,28 км/ч',
    jobs: ['plowing','seeding','large-area','universal'],
    tagline: {ru:'Больше запаса тяги для плотной почвы и больших агрегатов',ky:'Катуу топурак жана чоң жабдуу үчүн көбүрөөк тартуу күчү',en:'More pulling reserve for firm soils and larger implements','zh-CN':'为硬土壤和更大农具提供更强牵引储备'},
    description: {ru:'Подходит для более тяжёлой пахоты, широких сеялок и интенсивной сезонной работы.',ky:'Оор айдоо, кең сепкич жана активдүү сезондук жумуш үчүн ылайыктуу.',en:'Suitable for heavier plowing, wider seeders and intensive seasonal work.','zh-CN':'适合更重的犁耕、更宽的播种机和高强度季节作业。'},
    recommendedFor: {ru:'Средние и крупные хозяйства, где важен запас мощности.',ky:'Күчтүн запасы маанилүү болгон орто жана чоң чарбалар.',en:'Medium and large farms that need power in reserve.','zh-CN':'重视动力储备的中大型农场。'},
    specs: [
      ['Мощность','140 л.с.',explanation.power],['Ходоуменьшитель','Есть',explanation.creeper],['Коробка передач','24 вперёд / 24 назад',explanation.gearbox],['Колёсная база','2334 мм',explanation.wheelbase],['Масса','около 4800 кг',explanation.mass],['Регулировка колеи','Передняя и задняя',explanation.track]
    ]
  },
  {
    ...common,
    slug: 'changfa-cfg1604', model: 'CHANGFA CFG1604', series: 'G', power: 160,
    image: '/images/tractors/cfg1604.webp', thumb: '/images/tractors/cfg1604-thumb.webp', imageWidth:425, imageHeight:376, thumbWidth:425, thumbHeight:376,
    mass: 5800, wheelbase: 2853, gears: '32F / 32R', creeper: true, speed: '0,28–36,42 км/ч',
    jobs: ['heavy-work','plowing','large-area','deep-ripping'],
    tagline: {ru:'Сильная машина для тяжёлой сезонной нагрузки',ky:'Оор сезондук жүк үчүн күчтүү техника',en:'A strong machine for demanding seasonal workloads','zh-CN':'适合高强度季节作业的强劲机型'},
    description: {ru:'Большая масса и 32 передачи помогают точнее подобрать скорость для тяжёлого агрегата и сложной почвы.',ky:'Чоң салмак жана 32 берүү оор жабдуу менен татаал топуракта туура ылдамдык тандоого жардам берет.',en:'Higher mass and 32 gears help match the speed to heavy implements and difficult soil.','zh-CN':'更大的重量和32挡变速箱有助于适配重型农具和复杂土壤。'},
    recommendedFor: {ru:'Крупные поля, глубокое рыхление, интенсивная пахота и услуги механизации.',ky:'Чоң талаа, терең жумшартуу, күчтүү айдоо жана механизация кызматы.',en:'Large fields, deep ripping, intensive plowing and contracting.','zh-CN':'大地块、深松、重犁和农机作业服务。'},
    specs: [
      ['Мощность','160 л.с.',explanation.power],['Ходоуменьшитель','Есть',explanation.creeper],['Коробка передач','32 вперёд / 32 назад',explanation.gearbox],['Колёсная база','2853 мм',explanation.wheelbase],['Масса','около 5800 кг',explanation.mass],['Регулировка колеи','Передняя и задняя',explanation.track]
    ]
  },
  {
    ...common,
    slug: 'changfa-cfj2004', model: 'CHANGFA CFJ2004', series: 'J', power: 200,
    image: '/images/tractors/cfj2004.webp', thumb: '/images/tractors/cfj2004-thumb.webp', imageWidth:461, imageHeight:366, thumbWidth:461, thumbHeight:366,
    mass: 6810, wheelbase: 2825, gears: '32F / 32R', creeper: true, speed: '0,25–37,31 км/ч',
    jobs: ['heavy-work','large-area','deep-ripping','plowing'],
    tagline: {ru:'Для больших площадей и тяжёлых агрегатов',ky:'Чоң аянт жана оор жабдуу үчүн',en:'For large areas and heavy implements','zh-CN':'适合大面积和重型农具作业'},
    description: {ru:'Модель для хозяйств, где важны производительность, тяга и длительная работа с широким оборудованием.',ky:'Өндүрүмдүүлүк, тартуу күчү жана кең жабдуу менен узак иштөө маанилүү болгон чарбалар үчүн.',en:'Built for farms that prioritize output, pulling force and long shifts with wide implements.','zh-CN':'适合重视效率、牵引力以及长时间搭配宽幅农具作业的农场。'},
    recommendedFor: {ru:'Крупные агрокомпании, тракторные бригады и тяжёлые полевые работы.',ky:'Чоң агрокомпаниялар, трактор бригадалары жана оор талаа жумуштары.',en:'Large agricultural companies, tractor fleets and heavy field operations.','zh-CN':'大型农业企业、农机队和重型田间作业。'},
    specs: [
      ['Мощность','200 л.с.',explanation.power],['Ходоуменьшитель','Есть',explanation.creper ?? explanation.creeper],['Коробка передач','32 вперёд / 32 назад',explanation.gearbox],['Колёсная база','2825 мм',explanation.wheelbase],['Масса','около 6810 кг',explanation.mass],['Регулировка колеи','Передняя и задняя',explanation.track]
    ]
  },
  {
    ...common,
    slug: 'changfa-cfj220', model: 'CHANGFA CFJ220', series: 'J', power: 220,
    image: '/images/tractors/cfj220.webp', thumb: '/images/tractors/cfj220-thumb.webp', imageWidth:864, imageHeight:1242, thumbWidth:452, thumbHeight:650,
    gallery: ['/images/tractors/cfj220.webp','/images/gallery/cfj220-studio.webp','/images/gallery/factory-close.webp','/images/gallery/factory-side.webp'],
    mass: 7800, wheelbase: null, gears: '32F / 32R или 16F / 16R', creeper: null, speed: null,
    price: 6850000, priceLabel: '6 850 000 KGS с НДС',
    engine: '6-цилиндровый Turbo Diesel, Intercooler', pto: '540 / 1000 об/мин', lift: 4500, fuelTank: 350,
    hydraulics: '3–4 пары гидровыходов, зависит от комплектации', warranty: '1 год или 1000 моточасов',
    jobs: ['heavy-work','large-area','deep-ripping','plowing'],
    tagline: {ru:'220 л.с. для больших объёмов и тяжёлой работы',ky:'Чоң көлөм жана оор жумуш үчүн 220 ат күчү',en:'220 hp for high-volume and heavy-duty work','zh-CN':'220马力，面向大规模重载作业'},
    description: {ru:'Шестицилиндровый трактор с полным приводом, мощной гидравликой, комфортной кабиной и навеской категории III.',ky:'Алты цилиндр, толук жетектөө, күчтүү гидравлика, ыңгайлуу кабина жана III категориядагы асма системасы.',en:'Six-cylinder 4WD tractor with high-capacity hydraulics, a comfortable cab and Category III linkage.','zh-CN':'六缸四驱拖拉机，配备高性能液压系统、舒适驾驶室和III类悬挂。'},
    recommendedFor: {ru:'Крупные хозяйства, тяжёлая пахота, глубокорыхлители, широкие посевные комплексы и длительные смены.',ky:'Чоң чарба, оор айдоо, терең жумшарткыч, кең себүү комплекси жана узак смена.',en:'Large farms, heavy plowing, subsoilers, wide seeding systems and long shifts.','zh-CN':'大型农场、重犁、深松机、宽幅播种系统和长时间作业。'},
    specs: [
      ['Мощность','220 л.с. (162 кВт)',explanation.power],['Двигатель','6-цилиндровый Turbo Diesel, Intercooler',{ru:'Это сердце трактора. Турбина подаёт больше воздуха, а интеркулер охлаждает его для стабильной мощности.',ky:'Бул трактордун жүрөгү. Турбина көбүрөөк аба берет, интеркулер аны муздатып, күчтү туруктуу кармайт.',en:'The engine is the tractor’s heart. The turbo adds air and the intercooler cools it for steady power.','zh-CN':'发动机是拖拉机的核心。涡轮增压增加进气，中冷器降低进气温度，以保持稳定动力。'}],['Трансмиссия','Механическая синхронизированная, 32F/32R или 16F/16R',explanation.gearbox],['ВОМ','540 / 1000 об/мин',explanation.pto],['Грузоподъёмность навески','до 4500 кг, категория III',explanation.lift],['Гидравлика','3–4 пары гидровыходов',{ru:'Помогает поднимать и управлять навесным оборудованием. Количество выходов зависит от комплектации.',ky:'Асма жабдууну көтөрүп жана башкарууга жардам берет. Чыгыштардын саны комплектацияга жараша.',en:'Raises and controls implements. The number of hydraulic outlets depends on configuration.','zh-CN':'用于提升和控制农具。液压输出数量取决于具体配置。'}],['Топливный бак','около 350 л',{ru:'Большой бак позволяет дольше работать без дозаправки.',ky:'Чоң бак май куюусуз узагыраак иштөөгө жардам берет.',en:'A large tank supports longer work between refuelling stops.','zh-CN':'大容量油箱可延长连续作业时间。'}],['Эксплуатационная масса','около 7800 кг',explanation.mass],['Кабина','Панорамная, герметичная, кондиционер и отопитель',{ru:'Защищает оператора от пыли, жары и холода, снижая усталость во время длинной смены.',ky:'Айдоочуну чаңдан, ысыктан жана сууктан коргоп, узак сменада чарчоону азайтат.',en:'Protects the operator from dust, heat and cold and reduces fatigue on long shifts.','zh-CN':'可隔绝灰尘、炎热和寒冷，降低长时间作业的疲劳。'}]
    ]
  },
  {
    ...common,
    slug: 'changfa-cfk2404', model: 'CHANGFA CFK2404', series: 'K', power: 240,
    image: '/images/tractors/cfk2404.webp', thumb: '/images/tractors/cfk2404-thumb.webp', imageWidth:461, imageHeight:366, thumbWidth:461, thumbHeight:366,
    mass: 9375, wheelbase: 2866, gears: '32F / 32R', creeper: true, speed: '0,26–39,79 км/ч',
    jobs: ['heavy-work','large-area','deep-ripping'],
    tagline: {ru:'Максимальный запас мощности в текущем каталоге',ky:'Учурдагы каталогдогу эң чоң күч запасы',en:'The highest power reserve in the current catalogue','zh-CN':'当前目录中动力储备最高的机型'},
    description: {ru:'Тяжёлый трактор для крупных предприятий, больших площадей и агрегатов, требующих высокой тяги.',ky:'Чоң ишкана, чоң аянт жана күчтүү тартууну талап кылган жабдуу үчүн оор трактор.',en:'A heavy tractor for large enterprises, broad acreage and high-draft implements.','zh-CN':'面向大型企业、大面积地块和高牵引需求农具的重型拖拉机。'},
    recommendedFor: {ru:'Большие поля и предприятия, где простой техники особенно дорог.',ky:'Техниканын токтоп турушу кымбат болгон чоң талаа жана ишканалар.',en:'Large fields and businesses where downtime is especially costly.','zh-CN':'适合设备停机成本很高的大型农场和企业。'},
    specs: [
      ['Мощность','240 л.с.',explanation.power],['Ходоуменьшитель','Есть',explanation.creeper],['Коробка передач','32 вперёд / 32 назад',explanation.gearbox],['Колёсная база','2866 мм',explanation.wheelbase],['Масса','около 9375 кг',explanation.mass],['Регулировка колеи','Передняя и задняя',explanation.track]
    ]
  }
]

export const getTractor = (slug) => tractors.find(t => t.slug === slug)
export const formatPrice = (price) => price ? new Intl.NumberFormat('ru-RU').format(price) + ' KGS' : null

export const powerBands = [
  {id:'under-100', min:0,max:99,label:{ru:'до 100 л.с.',ky:'100 ат күчүнө чейин',en:'up to 100 hp','zh-CN':'100马力以下'}},
  {id:'100-130', min:100,max:130,label:{ru:'100–130 л.с.',ky:'100–130 ат күчү',en:'100–130 hp','zh-CN':'100–130马力'}},
  {id:'130-170', min:131,max:170,label:{ru:'130–170 л.с.',ky:'130–170 ат күчү',en:'130–170 hp','zh-CN':'130–170马力'}},
  {id:'170-210', min:171,max:210,label:{ru:'170–210 л.с.',ky:'170–210 ат күчү',en:'170–210 hp','zh-CN':'170–210马力'}},
  {id:'over-210', min:211,max:999,label:{ru:'более 210 л.с.',ky:'210 ат күчүнөн жогору',en:'over 210 hp','zh-CN':'210马力以上'}}
]
