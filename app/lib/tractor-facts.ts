import type { Tractor } from "../types";

/**
 * Короткие цифры трактора для карточки, фильтра, сравнения и блока характеристик.
 * Характеристики пришли от завода текстом («2150(safety frame)/2320(cab)»), поэтому вытаскиваем числа аккуратно.
 * Если в админке заполнены поля «Кабина» и «Коробка коротко», берём их.
 */

export type CabinKind = "cab" | "frame" | "both";

const spec = (tractor: Tractor, key: string) => tractor.specs?.[key] ?? "";
const numbers = (value: string) => (value.replace(/(\d),(\d)/g, "$1.$2").match(/\d+(?:\.\d+)?/g) ?? []).map(Number);

/** Масса, кг: первое правдоподобное число (у трактора не меньше 800 кг). */
export function tractorMassKg(tractor: Tractor) {
  const first = numbers(spec(tractor, "Минимальная масса, кг")).find((n) => n >= 800 && n <= 20000);
  return first ? Math.round(first) : null;
}

/** Коробка передач коротко: «12+12», «16+16». */
export function tractorGearbox(tractor: Tractor) {
  if (tractor.gearbox?.trim()) return tractor.gearbox.trim();
  const value = spec(tractor, "Коробка передач");
  const plain = value.match(/(\d{1,2})\s*\+\s*(\d{1,2})(?!\s*\))/);
  if (plain) return `${plain[1]}+${plain[2]}`;
  const combo = value.match(/\(1\s*\+\s*1\)\s*[x×]\s*\((\d)\s*[x×]\s*(\d)\)/i);
  if (combo) {
    const n = Number(combo[1]) * Number(combo[2]);
    return `${n}+${n}`;
  }
  return null;
}

/** Кабина: по полю из админки или по упоминаниям в характеристиках. */
export function tractorCabin(tractor: Tractor): CabinKind | null {
  if (tractor.cabin === "cab" || tractor.cabin === "frame" || tractor.cabin === "both") return tractor.cabin;
  const text = Object.values(tractor.specs ?? {}).join(" ").toLowerCase();
  const cab = /\bcab\b|cab\)|кабин|driver's cab/.test(text);
  const frame = /safety frame|дуг/.test(text);
  if (cab && frame) return "both";
  if (cab) return "cab";
  return null;
}

/** Номинальное тяговое усилие, кН: первое число. */
export function tractorTractionKn(tractor: Tractor) {
  const first = numbers(spec(tractor, "Номинальное тяговое усилие, кН")).find((n) => n > 0 && n < 200);
  return first ?? null;
}

/** Грузоподъёмность навески, кН. */
export function tractorLiftKn(tractor: Tractor) {
  const first = numbers(spec(tractor, "Грузоподъёмность навески, кН")).find((n) => n > 0 && n < 200);
  return first ?? null;
}

/** Максимальная скорость вперёд, км/ч: самое большое число в строке скоростей. */
export function tractorMaxSpeed(tractor: Tractor) {
  const all = numbers(spec(tractor, "Скорость движения, км/ч")).filter((n) => n > 0 && n < 80);
  return all.length ? Math.round(Math.max(...all)) : null;
}

/** Мощность двигателя, кВт. */
export function tractorKw(tractor: Tractor) {
  const first = numbers(spec(tractor, "Номинальная мощность, кВт")).find((n) => n > 5 && n < 500);
  return first ?? null;
}

/** Площадь поля из строки «20–60 га», «до 30 га», «от 250 га», «150+ га». Верх без предела: Infinity. */
export function parseFarmArea(value: string): [number, number] | null {
  const text = value.toLowerCase().replace(/\s/g, "");
  const nums = numbers(text);
  if (!nums.length) return null;
  if (/^(до|upto|чейин)/.test(text) || /чейин$/.test(text)) return [0, nums[0]];
  if (/^(от|from)/.test(text) || /\+|жогору/.test(text)) return [nums[0], Infinity];
  if (nums.length >= 2) return [Math.min(nums[0], nums[1]), Math.max(nums[0], nums[1])];
  return [0, nums[0]];
}

/** Подходит ли трактор под участок клиента: диапазоны пересекаются. */
export function fitsLand(tractor: Tractor, land: [number, number]) {
  const area = parseFarmArea(tractor.farmArea);
  if (!area) return false;
  return area[0] < land[1] && area[1] > land[0];
}

/** Группы характеристик для блока «на одном экране». Ключи как в данных (по-русски). */
export const SPEC_GROUPS: { id: "engine" | "drive" | "size" | "hitch"; keys: string[] }[] = [
  { id: "engine", keys: ["Модель двигателя", "Тип двигателя", "Номинальная мощность, кВт", "Номинальные обороты, об/мин"] },
  { id: "drive", keys: ["Коробка передач", "Сцепление", "Тормоза", "Скорость движения, км/ч"] },
  { id: "size", keys: ["Габариты, мм", "Минимальная масса, кг", "Дорожный просвет, мм", "Колёсная база, мм", "Колея передних колёс, мм", "Колея задних колёс, мм", "Передние шины", "Задние шины"] },
  { id: "hitch", keys: ["Грузоподъёмность навески, кН", "Скорость ВОМ, об/мин", "Номинальное тяговое усилие, кН"] },
];
