import type { Locale } from "../types";

/** Переводы интерфейса сайта: каждая строка задаёт ключ и текст на ru, ky, en, поэтому ключ всегда есть во всех трёх языках. */
const rows: Array<[key: string, ru: string, ky: string, en: string]> = [
  // Общие элементы
  ["ui.skipLink", "Перейти к содержанию", "Мазмунга өтүү", "Skip to content"],
  ["ui.common.close", "Закрыть", "Жабуу", "Close"],
  ["ui.breadcrumbs", "Хлебные крошки", "Навигация жолу", "Breadcrumbs"],
  ["ui.currency.som", "сом", "сом", "som"],
  ["ui.loader.label", "Загрузка…", "Жүктөлүүдө…", "Loading…"],
  ["ui.loader.next", "Открываем следующий раздел", "Кийинки бөлүм ачылууда", "Opening the next section"],

  // Выбор языка
  ["ui.lang.choose", "Выберите язык", "Тилди тандаңыз", "Choose a language"],
  ["ui.lang.options", "Язык", "Тил", "Language"],
  ["ui.lang.current", "Язык: {name}", "Тил: {name}", "Language: {name}"],

  // Шапка и подвал
  ["ui.header.social", "Социальные сети и контакты", "Социалдык тармактар жана байланыштар", "Social media and contacts"],
  ["ui.header.home", "ATADAN Changfa: на главную", "ATADAN Changfa: башкы бетке", "ATADAN Changfa: home page"],
  ["ui.header.mainNav", "Основная навигация", "Негизги навигация", "Main navigation"],
  ["ui.header.mobileNav", "Мобильная навигация", "Мобилдик навигация", "Mobile navigation"],
  ["ui.footer.address", "Бишкек, ул. Шевченко, 114", "Бишкек ш., Шевченко көч., 114", "114 Shevchenko St, Bishkek"],
  ["ui.footer.distributor", "Официальный дистрибьютор Changfa", "Changfa расмий дистрибьютору", "Official Changfa distributor"],

  // Юридические страницы
  ["ui.legal.privacy", "Политика конфиденциальности", "Купуялык саясаты", "Privacy policy"],
  ["ui.legal.terms", "Условия использования", "Колдонуу шарттары", "Terms of use"],
  ["ui.legal.cookies", "Политика cookie", "Cookie саясаты", "Cookie policy"],
  ["ui.legal.cookieSettings", "Настроить cookie", "Cookie жөндөөлөрү", "Cookie settings"],
  ["ui.legal.navPrivacy", "Конфиденциальность", "Купуялык", "Privacy"],
  ["ui.legal.navTerms", "Условия", "Шарттар", "Terms"],
  ["ui.legal.navCookies", "Cookie", "Cookie", "Cookies"],

  // Телефон
  ["ui.phone.country", "Страна телефона", "Телефондун өлкөсү", "Phone country"],
  ["ui.phone.number", "Номер телефона без кода страны", "Өлкө кодусуз телефон номери", "Phone number without the country code"],
  ["ui.phone.hint", "Введите {count} цифр. Пример: {example}", "{count} цифра жазыңыз. Мисалы: {example}", "Enter {count} digits. Example: {example}"],
  ["ui.phone.example", "Например: {example}", "Мисалы: {example}", "For example: {example}"],
  ["ui.phone.country.KG", "Кыргызстан", "Кыргызстан", "Kyrgyzstan"],
  ["ui.phone.country.RU", "Россия", "Россия", "Russia"],
  ["ui.phone.country.KZ", "Казахстан", "Казакстан", "Kazakhstan"],
  ["ui.phone.country.UZ", "Узбекистан", "Өзбекстан", "Uzbekistan"],
  ["ui.phone.country.TJ", "Таджикистан", "Тажикстан", "Tajikistan"],

  // Форма заявки
  ["ui.lead.error", "Не удалось отправить заявку", "Өтүнмөнү жөнөтүү мүмкүн болгон жок", "Could not send the request"],
  ["ui.lead.successManager", "Менеджер в скором времени свяжется с вами", "Менеджер жакында сиз менен байланышат", "A manager will contact you shortly"],
  ["ui.lead.fullName", "ФИО", "Аты-жөнү", "Full name"],
  ["ui.lead.fullNamePlaceholder", "Фамилия, имя, отчество", "Фамилиясы, аты, атасынын аты", "First and last name"],
  ["ui.lead.description", "Описание", "Сүрөттөмө", "Description"],
  ["ui.lead.handoff", "После отправки откроется WhatsApp с вашей заявкой.", "Жөнөткөндөн кийин өтүнмөңүз менен WhatsApp ачылат.", "After you send it, WhatsApp opens with your request."],
  ["ui.lead.interested", "Интересует Changfa {model}", "Changfa {model} кызыктырат", "I am interested in Changfa {model}"],

  // Запчасти
  ["ui.parts.request", "Запчасть: {name}, артикул {sku}", "Тетик: {name}, артикул {sku}", "Part: {name}, part number {sku}"],
  ["ui.parts.requestTractor", ", трактор {model}", ", трактор {model}", ", tractor {model}"],
  ["ui.parts.need", "Нужна запчасть. Модель трактора и VIN: ", "Тетик керек. Трактордун модели жана VIN: ", "I need a spare part. Tractor model and VIN: "],

  // Карточка трактора и каталог
  ["ui.card.details", "Подробнее о {model}", "{model} тууралуу толугураак", "More about {model}"],
  ["ui.card.alt", "Трактор Changfa {model}", "Changfa {model} трактору", "Changfa {model} tractor"],
  ["ui.card.approx", "ориентировочно", "болжолдуу", "approx."],
  ["ui.catalog.selection", "Подборка", "Тандалма", "Featured"],
  ["ui.catalog.popular", "Популярные модели", "Популярдуу моделдер", "Popular models"],
  ["ui.catalog.notFoundMeta", "Модель не найдена | ATADAN", "Модель табылган жок | ATADAN", "Model not found | ATADAN"],

  // Страница модели
  ["ui.product.usdNote", "Ориентировочная цена в долларах. Точную стоимость подтвердит менеджер.", "Доллар менен болжолдуу баа. Так баасын менеджер ырастайт.", "Approximate price in US dollars. A manager will confirm the exact cost."],
  ["ui.product.discussTitle", "Обсудите модель с менеджером", "Моделди менеджер менен талкуулаңыз", "Discuss this model with a manager"],
  ["ui.product.discussText", "Укажите ваши контакты и задачу. Подготовим предложение по выбранному трактору и продолжим разговор в WhatsApp.", "Байланышыңызды жана милдетиңизди жазыңыз. Тандалган трактор боюнча сунуш даярдап, сүйлөшүүнү WhatsAppта улантабыз.", "Leave your contacts and describe the job. We will prepare an offer for this tractor and continue the conversation on WhatsApp."],

  // Подбор трактора (квиз)
  ["ui.quiz.step", "Вопрос {current} из {total}", "Суроо {current} / {total}", "Question {current} of {total}"],
  ["ui.quiz.power", "Какой мощности трактор вам нужен?", "Сизге канча кубаттуулуктагы трактор керек?", "What tractor power do you need?"],
  ["ui.quiz.region", "Из какого вы региона?", "Сиз кайсы аймактансыз?", "Which region are you from?"],
  ["ui.region.batken", "Баткенская область", "Баткен облусу", "Batken Region"],
  ["ui.region.jalalabad", "Джалал-Абадская область", "Жалал-Абад облусу", "Jalal-Abad Region"],
  ["ui.region.issykkul", "Иссык-Кульская область", "Ысык-Көл облусу", "Issyk-Kul Region"],
  ["ui.region.naryn", "Нарынская область", "Нарын облусу", "Naryn Region"],
  ["ui.region.osh", "Ошская область", "Ош облусу", "Osh Region"],
  ["ui.region.talas", "Таласская область", "Талас облусу", "Talas Region"],
  ["ui.region.chuy", "Чуйская область", "Чүй облусу", "Chuy Region"],
  ["ui.region.bishkekCity", "г. Бишкек", "Бишкек шаары", "Bishkek city"],
  ["ui.region.oshCity", "г. Ош", "Ош шаары", "Osh city"],

  // Карта офиса
  ["ui.map.title", "Карта офиса ATADAN", "ATADAN кеңсесинин картасы", "ATADAN office map"],

  // Новости
  ["ui.news.photo", "{title}, фото {n}", "{title}, {n}-сүрөт", "{title}, photo {n}"],
  ["ui.news.author.expert", "Экспертная команда ATADAN", "ATADAN эксперттер командасы", "ATADAN expert team"],
  ["ui.news.author.service", "Сервисная команда ATADAN", "ATADAN сервис командасы", "ATADAN service team"],
  ["ui.news.author.editorial", "Редакция ATADAN", "ATADAN редакциясы", "ATADAN editorial team"],
  ["ui.meta.articleNotFound", "Материал не найден | ATADAN", "Материал табылган жок | ATADAN", "Article not found | ATADAN"],

  // О компании
  ["ui.about.photoAlt", "Трактор Changfa в поле у гор", "Тоолордун этегиндеги талаада Changfa трактору", "Changfa tractor in a field below the mountains"],
  ["ui.about.founderTag", "ATADAN · CHANGFA · Кыргызстан", "ATADAN · CHANGFA · Кыргызстан", "ATADAN · CHANGFA · Kyrgyzstan"],

  // Сервис
  ["ui.service.materialsLabel", "Полезные материалы", "Пайдалуу материалдар", "Useful materials"],
  ["ui.service.materialsTitle", "Сервис Changfa подробно", "Changfa сервиси толугураак", "Changfa service in detail"],
  ["ui.service.allMaterials", "Все материалы", "Бардык материалдар", "All materials"],
  ["ui.service.photo", "{title}: фото {n}", "{title}: {n}-сүрөт", "{title}: photo {n}"],
  ["ui.service.works", "Что входит в работу", "Жумушка эмнелер кирет", "What the work includes"],
  ["ui.service.conditions", "Условия", "Шарттар", "Terms"],
  ["ui.service.contact", "Связаться с сервисом", "Сервис менен байланышуу", "Contact service"],

  // Страница 404
  ["ui.404.kicker", "Маршрут потерян", "Жол адашты", "Route lost"],
  ["ui.404.title", "Этой дороги пока нет", "Бул жол азырынча жок", "This road does not exist yet"],
  ["ui.404.text", "Похоже, адрес изменился. Вернитесь к каталогу Changfa или начните с главной страницы ATADAN.", "Дарек өзгөргөн окшойт. Changfa каталогуна кайтыңыз же ATADANдын башкы бетинен баштаңыз.", "The address seems to have changed. Go back to the Changfa catalog or start from the ATADAN home page."],
  ["ui.404.catalog", "Открыть каталог", "Каталогду ачуу", "Open catalog"],
  ["ui.404.home", "На главную", "Башкы бетке", "Home page"],
  ["ui.404.links", "Полезные разделы", "Пайдалуу бөлүмдөр", "Useful sections"],
  ["ui.404.contact", "Связаться с нами", "Биз менен байланышуу", "Contact us"],
];

function build(index: 1 | 2 | 3) {
  return Object.fromEntries(rows.map((row) => [row[0], row[index]]));
}

export const uiCopy: Record<Locale, Record<string, string>> = {
  ru: build(1),
  ky: build(2),
  en: build(3),
};
