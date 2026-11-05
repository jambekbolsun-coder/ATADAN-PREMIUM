"use client";
export function PrintButton() {
  return <button type="button" className="doc-print" onClick={() => window.print()}>Печать / Сохранить PDF</button>;
}
