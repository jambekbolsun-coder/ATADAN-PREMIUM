import type { Locale, Localized, TractorTranslation } from './types'

export const locales: Locale[] = ['kg', 'ru', 'en']

export const ui = {
  ru: {
    home: 'Главная', tractors: 'Тракторы', about: 'О компании', contacts: 'Контакты', catalog: 'Смотреть тракторы',
    more: 'Подробнее', whatsapp: 'WhatsApp', official: 'Официальный дистрибьютор', power: 'Мощность', hectares: 'Для хозяйства',
    hp: 'л.с.', price: 'Цена', askPrice: 'Уточнить цену', inStock: 'В наличии', inTransit: 'В пути', onOrder: 'Под заказ', unavailable: 'Нет в наличии',
    yearsMarket: 'на рынке', kyrgyzstan: 'Кыргызстан', featuredTitle: 'Тракторы CHANGFA', featuredText: 'Выберите модель и изучите её в деталях.',
    comfortTitle: 'Комфорт для долгой работы', comfortText: 'Большие изображения, видео и реальные характеристики помогают понять трактор до разговора с консультантом.',
    companyTitle: 'ATADAN', companySub: 'Официальный дистрибьютор CHANGFA в Кыргызстане.', founder: 'Основатель',
    allTractors: 'Все тракторы', search: 'Поиск модели', powerFilter: 'Мощность', status: 'Статус', reset: 'Сбросить', empty: 'Тракторы пока не добавлены',
    emptyHint: 'Владелец добавит модели через админ-панель — карточки появятся здесь автоматически.',
    specs: 'Технические характеристики', gallery: 'Галерея', installment: 'Рассрочка', calculate: 'Рассчитать', downPayment: 'Первоначальный взнос',
    term: 'Срок', months: 'мес.', monthly: 'в месяц', total: 'Общая сумма', financing: 'Сумма финансирования', consult: 'Получить консультацию',
    back: 'Назад', notFound: 'Трактор не найден', loading: 'Загрузка…', instagram: 'Instagram', address: 'Адрес', schedule: 'График',
    docs: 'Документы', menu: 'Меню', close: 'Закрыть'
  },
  kg: {
    home: 'Башкы бет', tractors: 'Тракторлор', about: 'Компания жөнүндө', contacts: 'Байланыш', catalog: 'Тракторлорду көрүү',
    more: 'Толугураак', whatsapp: 'WhatsApp', official: 'Расмий дистрибьютор', power: 'Кубаттуулук', hectares: 'Чарба үчүн',
    hp: 'а.к.', price: 'Баасы', askPrice: 'Баасын тактоо', inStock: 'Бар', inTransit: 'Жолдо', onOrder: 'Заказ менен', unavailable: 'Азыр жок',
    yearsMarket: 'жыл рынокто', kyrgyzstan: 'Кыргызстан', featuredTitle: 'CHANGFA тракторлору', featuredText: 'Моделди тандап, майда-чүйдөсүнө чейин таанышыңыз.',
    comfortTitle: 'Узак ишке ылайык комфорт', comfortText: 'Чоң сүрөттөр, видео жана реалдуу мүнөздөмөлөр консультант менен сүйлөшүүдөн мурда тракторду түшүнүүгө жардам берет.',
    companyTitle: 'ATADAN', companySub: 'Кыргызстандагы CHANGFA тракторлорунун расмий дистрибьютору.', founder: 'Негиздөөчү',
    allTractors: 'Бардык тракторлор', search: 'Модель издөө', powerFilter: 'Кубаттуулук', status: 'Статус', reset: 'Тазалоо', empty: 'Азырынча трактор кошула элек',
    emptyHint: 'Ээси моделдерди админ-панелден кошкондо, алар бул жерде автоматтык түрдө чыгат.',
    specs: 'Техникалык мүнөздөмөлөр', gallery: 'Галерея', installment: 'Бөлүп төлөө', calculate: 'Эсептөө', downPayment: 'Баштапкы төлөм',
    term: 'Мөөнөт', months: 'ай', monthly: 'айына', total: 'Жалпы сумма', financing: 'Каржылоо суммасы', consult: 'Консультация алуу',
    back: 'Артка', notFound: 'Трактор табылган жок', loading: 'Жүктөлүүдө…', instagram: 'Instagram', address: 'Дарек', schedule: 'Иш убактысы',
    docs: 'Документтер', menu: 'Меню', close: 'Жабуу'
  },
  en: {
    home: 'Home', tractors: 'Tractors', about: 'About', contacts: 'Contacts', catalog: 'View tractors',
    more: 'Explore', whatsapp: 'WhatsApp', official: 'Official distributor', power: 'Power', hectares: 'Farm size',
    hp: 'HP', price: 'Price', askPrice: 'Ask for price', inStock: 'In stock', inTransit: 'In transit', onOrder: 'On order', unavailable: 'Unavailable',
    yearsMarket: 'years in market', kyrgyzstan: 'Kyrgyzstan', featuredTitle: 'CHANGFA tractors', featuredText: 'Choose a model and explore it in detail.',
    comfortTitle: 'Comfort for long working days', comfortText: 'Large visuals, video and real specifications help buyers understand the tractor before speaking to a consultant.',
    companyTitle: 'ATADAN', companySub: 'Official distributor of CHANGFA tractors in Kyrgyzstan.', founder: 'Founder',
    allTractors: 'All tractors', search: 'Search model', powerFilter: 'Power', status: 'Status', reset: 'Reset', empty: 'No tractors added yet',
    emptyHint: 'Once the owner adds models in the admin panel, they will appear here automatically.',
    specs: 'Technical specifications', gallery: 'Gallery', installment: 'Installment', calculate: 'Calculate', downPayment: 'Down payment',
    term: 'Term', months: 'mo.', monthly: 'per month', total: 'Total', financing: 'Financed amount', consult: 'Get consultation',
    back: 'Back', notFound: 'Tractor not found', loading: 'Loading…', instagram: 'Instagram', address: 'Address', schedule: 'Hours',
    docs: 'Documents', menu: 'Menu', close: 'Close'
  }
} as const

export function copy(locale: Locale) { return ui[locale] }
export function localize(value: unknown, locale: Locale, fallback = ''): string {
  if (!value || typeof value !== 'object') return fallback
  const map = value as Localized
  return map[locale] || map.ru || map.kg || map.en || fallback
}
export function tractorText(translations: TractorTranslation[] | undefined, locale: Locale) {
  const own = translations?.find((x) => x.locale === locale)
  const fallback = translations?.find((x) => x.locale === 'ru') || translations?.[0]
  return own || fallback
}
export function localeFromPath(pathname: string): Locale {
  const first = pathname.split('/').filter(Boolean)[0]
  return first === 'kg' || first === 'en' || first === 'ru' ? first : 'ru'
}
