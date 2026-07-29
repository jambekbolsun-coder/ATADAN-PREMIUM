import { Info } from 'lucide-react'
import { localize } from '../data/tractors'
import { useTranslation } from 'react-i18next'
import { langCode } from '../utils/helpers'
export default function SpecTable({specs}){const {t,i18n}=useTranslation(); const lang=langCode(i18n);return <div className="spec-table">{specs.map(([name,value,explanation])=><div className="spec-row" key={name}><div><span>{name}</span><strong>{value}</strong></div><div className="spec-explain"><Info size={18}/><p><b>{t('model.simple')}:</b> {localize(explanation,lang)}</p></div></div>)}</div>}
