/**
 * Темы админки. Выбор хранится в cookie на устройстве, поэтому сервер сразу рисует нужную тему:
 * без скрипта, без мигания и без расхождений при гидрации. Серверное чтение - в theme-server.ts.
 */
export const AX_THEMES = [
  { key: "forest", label: "Лес", hint: "тёмно-зелёное меню, белые карточки", preview: ["#0b2e1f", "#eef4f0", "#146b3a"] },
  { key: "field", label: "Поле", hint: "всё светлое, зелёный акцент", preview: ["#ffffff", "#f6f4ec", "#167a42"] },
  { key: "night", label: "Ночь", hint: "тёмная тема", preview: ["#050c09", "#0f1b15", "#3fbd76"] },
] as const;

export type AxTheme = (typeof AX_THEMES)[number]["key"];
export const AX_THEME_COOKIE = "ax_theme";

export function normalizeTheme(value: string | undefined | null): AxTheme {
  return value === "field" || value === "night" ? value : "forest";
}
