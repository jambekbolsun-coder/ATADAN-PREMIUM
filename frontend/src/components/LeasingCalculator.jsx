import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { calculateLease, formatKgs } from '../utils/helpers'
export default function LeasingCalculator({initialPrice=6850000}){
 const {t}=useTranslation(); const [price,setPrice]=useState(initialPrice); const [downPercent,setDown]=useState(10); const [annualRate,setRate]=useState(6); const [months,setMonths]=useState(84)
 const result=useMemo(()=>calculateLease({price:Number(price)||0,downPercent:Number(downPercent),annualRate:Number(annualRate),months:Number(months)}),[price,downPercent,annualRate,months])
 return <div className="leasing-calculator"><div className="calc-inputs">
  <label>{t('leasing.price')}<input type="number" min="0" value={price} onChange={e=>setPrice(e.target.value)}/></label>
  <label>{t('leasing.down')}: {downPercent}%<input type="range" min="10" max="50" step="5" value={downPercent} onChange={e=>setDown(e.target.value)}/></label>
  <label>{t('leasing.rate')}: {annualRate}%<input type="range" min="0" max="20" step="0.5" value={annualRate} onChange={e=>setRate(e.target.value)}/></label>
  <label>{t('leasing.term')}: {months} {t('leasing.months')}<input type="range" min="12" max="120" step="12" value={months} onChange={e=>setMonths(e.target.value)}/></label>
 </div><div className="calc-results"><div><span>{t('leasing.down')}</span><strong>{formatKgs(result.down)}</strong></div><div><span>{t('leasing.financed')}</span><strong>{formatKgs(result.principal)}</strong></div><div className="primary-result"><span>{t('leasing.monthly')}</span><strong>≈ {formatKgs(result.payment)}</strong></div><small>{t('leasing.warning')}</small></div></div>
}
