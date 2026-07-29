import { useTranslation } from 'react-i18next'
const languages = [
  ['ru','🇷🇺','Русский'],['ky','🇰🇬','Кыргызча'],['en','🇬🇧','English'],['zh-CN','🇨🇳','中文']
]
export default function LanguageSwitcher(){
  const {i18n}=useTranslation()
  return <select className="lang-select" value={i18n.resolvedLanguage || 'ru'} onChange={e=>i18n.changeLanguage(e.target.value)} aria-label="Language">
    {languages.map(([code,flag,label])=><option value={code} key={code}>{flag} {label}</option>)}
  </select>
}
