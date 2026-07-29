import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import ru from './locales/ru.json'
import ky from './locales/ky.json'
import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { ru:{translation:ru}, ky:{translation:ky}, en:{translation:en}, 'zh-CN':{translation:zhCN} },
    fallbackLng: 'ru',
    supportedLngs: ['ru','ky','en','zh-CN'],
    load: 'currentOnly',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage','navigator'], caches:['localStorage'] }
  })

export default i18n
