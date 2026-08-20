export function formatPrice(price: number | null) {
  return price ? `${new Intl.NumberFormat("ru-RU").format(price)} сом` : "Цена по запросу";
}
