"use client";
/** Логотип банка в форме «Банки и ставки»: загрузка картинки, значение уходит в скрытое поле logo. */
import { useState } from "react";
import { ImageInput } from "../../../_ui/upload";

export function BankLogoField({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <ImageInput value={value} onChange={setValue} label="Загрузить логотип" />
      <input type="hidden" name="logo" value={value} />
    </>
  );
}
