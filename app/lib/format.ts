export function formatPrice(price: number | null) {
  return price ? `${new Intl.NumberFormat("ru-RU").format(price)} сом` : "Цена по запросу";
}

export function formatApproximateUsdPrice(price: number | undefined) {
  return price && price > 0
    ? `≈ $${new Intl.NumberFormat("ru-RU").format(price)}`
    : "Цена по запросу";
}
