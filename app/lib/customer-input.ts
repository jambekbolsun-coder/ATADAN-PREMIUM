export const regions = ["Баткенская область", "Джалал-Абадская область", "Иссык-Кульская область", "Нарынская область", "Ошская область", "Таласская область", "Чуйская область", "г. Бишкек", "г. Ош"] as const;
export const powerRanges = [
  { label: "50–90 л.с.", min: 50, max: 90, query: 50 },
  { label: "90–140 л.с.", min: 90, max: 140, query: 100 },
  { label: "140–180 л.с.", min: 140, max: 180, query: 150 },
  { label: "180+ л.с.", min: 180, max: 999, query: 200 },
] as const;
export const phoneCountries = [
  { id: "KG", name: "Кыргызстан", code: "+996", length: 9, example: "700 123 456" },
  { id: "RU", name: "Россия", code: "+7", length: 10, example: "999 123 45 67" },
  { id: "KZ", name: "Казахстан", code: "+7", length: 10, example: "701 123 45 67" },
  { id: "UZ", name: "Узбекистан", code: "+998", length: 9, example: "90 123 45 67" },
  { id: "TJ", name: "Таджикистан", code: "+992", length: 9, example: "90 123 45 67" },
] as const;
export function validPublicPhone(value: string) {
  if (!/^[+\d\s()-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return /^(?:996\d{9}|7\d{10}|998\d{9}|992\d{9})$/.test(digits);
}
export const LEASE_MONTHS = 84;
export const successMessage = "Менеджер в скором времени свяжется с вами";
