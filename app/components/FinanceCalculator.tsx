"use client";

import { Calculator, PhoneCall } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "./I18n";

export function FinanceCalculator() {
  const [price, setPrice] = useState(2500000);
  const [down, setDown] = useState(30);
  const [months, setMonths] = useState(24);
  const { t } = useI18n();
  const monthly = useMemo(() => Math.round((price * (1 - down / 100)) / months), [price, down, months]);
  const money = (value: number) => new Intl.NumberFormat("ru-RU").format(value);
  return (
    <div className="finance-calculator">
      <div className="calculator-controls">
        <span className="mini-label"><Calculator size={16} /> {t("finance.calcLabel")}</span>
        <label><span>{t("finance.price")} <strong>{money(price)} сом</strong></span><input type="range" min={1000000} max={12000000} step={100000} value={price} onChange={(event) => setPrice(Number(event.target.value))} /></label>
        <label><span>{t("finance.down")} <strong>{down}%</strong></span><input type="range" min={10} max={70} step={5} value={down} onChange={(event) => setDown(Number(event.target.value))} /></label>
        <label><span>{t("finance.term")} <strong>{months} {t("common.month")}</strong></span><input type="range" min={6} max={48} step={6} value={months} onChange={(event) => setMonths(Number(event.target.value))} /></label>
      </div>
      <div className="calculator-result"><span>{t("finance.payment")}</span><strong>{money(monthly)} <small>сом / {t("common.month")}</small></strong><p>{t("finance.calcNote")}</p><a className="primary-btn" href="tel:+996706131404"><PhoneCall size={18} /> {t("finance.calcCta")}</a></div>
    </div>
  );
}
