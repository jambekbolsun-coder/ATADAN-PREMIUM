import { cookies } from "next/headers";
import { AX_THEME_COOKIE, normalizeTheme, type AxTheme } from "./theme";

export async function currentTheme(): Promise<AxTheme> {
  return normalizeTheme((await cookies()).get(AX_THEME_COOKIE)?.value);
}
