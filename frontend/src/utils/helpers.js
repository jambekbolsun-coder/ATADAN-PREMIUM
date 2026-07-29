export const whatsappUrl = (message='Здравствуйте! Хочу получить консультацию по трактору CHANGFA.') =>
  `https://wa.me/996706131404?text=${encodeURIComponent(message)}`

export const formatKgs = (value) => new Intl.NumberFormat('ru-RU').format(Math.round(value)) + ' KGS'

export const langCode = (i18n) => ['ru','ky','en','zh-CN'].includes(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'ru'

export const calculateLease = ({price, downPercent, annualRate, months}) => {
  const down = price * downPercent / 100
  const principal = Math.max(0, price - down)
  const monthlyRate = annualRate / 100 / 12
  const payment = monthlyRate === 0 ? principal / months : principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1)
  return {down, principal, payment}
}
