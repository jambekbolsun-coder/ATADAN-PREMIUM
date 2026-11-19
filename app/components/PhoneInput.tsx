"use client";
import { useId, useState } from "react";
import { phoneCountries } from "../lib/customer-input";
import { useI18n } from "./I18n";

export function PhoneInput() {
  const id = useId();
  const { t } = useI18n();
  const [countryId, setCountryId] = useState("KG");
  const [number, setNumber] = useState("");
  const country = phoneCountries.find((item) => item.id === countryId)!;
  function update(value: string) {
    let digits = value.replace(/\D/g, "");
    if (
      digits.startsWith(country.code.slice(1)) &&
      digits.length > country.length
    )
      digits = digits.slice(country.code.length - 1);
    if (
      (countryId === "RU" || countryId === "KZ") &&
      digits.length === 11 &&
      digits.startsWith("8")
    )
      digits = digits.slice(1);
    if (countryId === "KG" && digits.length === 10 && digits.startsWith("0"))
      digits = digits.slice(1);
    setNumber(digits.slice(0, country.length));
  }
  return (
    <div className="phone-field">
      <label htmlFor={id}>{t("lead.phone")}</label>
      <div className="phone-country">
        <select
          aria-label={t("ui.phone.country")}
          value={countryId}
          onChange={(event) => {
            setCountryId(event.target.value);
            setNumber("");
          }}
        >
          {phoneCountries.map((item) => (
            <option key={item.id} value={item.id}>
              {t(`ui.phone.country.${item.id}`)} ({item.code})
            </option>
          ))}
        </select>
      </div>
      <div className="phone-input">
        <span aria-hidden="true">{country.code}</span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          aria-label={t("ui.phone.number")}
          aria-describedby={`${id}-example`}
          required
          value={number}
          onChange={(event) => update(event.target.value)}
          pattern={`[0-9]{${country.length}}`}
          title={t("ui.phone.hint", { count: country.length, example: `${country.code} ${country.example}` })}
          placeholder={country.example}
        />
      </div>
      <small className="phone-example" id={`${id}-example`}>{t("ui.phone.example", { example: `${country.code} ${country.example}` })}</small>
      <input type="hidden" name="phone" value={`${country.code}${number}`} />
    </div>
  );
}
