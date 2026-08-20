"use client";

import { Calculator, PhoneCall } from "lucide-react";
import { useMemo, useState } from "react";

export function FinanceCalculator() {
  const [price, setPrice] = useState(2500000);
  const [down, setDown] = useState(30);
  const [months, setMonths] = useState(24);
  const monthly = useMemo(() => Math.round((price * (1 - down / 100)) / months), [price, down, months]);
  const money = (value: number) => new Intl.NumberFormat("ru-RU").format(value);
  return (
    <div className="finance-calculator">
      <div className="calculator-controls">
        <span className="mini-label"><Calculator size={16} /> Предварительный расчёт</span>
        <label><span>Стоимость техники <strong>{money(price)} сом</strong></span><input type="range" min={1000000} max={12000000} step={100000} value={price} onChange={(event) => setPrice(Number(event.target.value))} /></label>
        <label><span>Первоначальный взнос <strong>{down}%</strong></span><input type="range" min={10} max={70} step={5} value={down} onChange={(event) => setDown(Number(event.target.value))} /></label>
        <label><span>Срок <strong>{months} мес.</strong></span><input type="range" min={6} max={48} step={6} value={months} onChange={(event) => setMonths(Number(event.target.value))} /></label>
      </div>
      <div className="calculator-result"><span>Ориентировочный платёж</span><strong>{money(monthly)} <small>сом / мес.</small></strong><p>Точный график и условия рассчитываются индивидуально после одобрения партнёром.</p><a className="primary-btn" href="tel:+996706131404"><PhoneCall size={18} /> Получить расчёт</a></div>
    </div>
  );
}
