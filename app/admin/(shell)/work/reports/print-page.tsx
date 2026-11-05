"use client";
import { Printer } from "lucide-react";
export function PrintPage() {
  return <button type="button" className="ax-btn" onClick={() => window.print()}><Printer size={16} aria-hidden />Печать / PDF</button>;
}
