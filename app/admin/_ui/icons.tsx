import {
  ArrowLeftRight, Banknote, Bell, BookOpen, Briefcase, Building2, ChartColumn, House, Inbox, KeyRound, Landmark, List, LogOut,
  Megaphone, Newspaper, Package, Palette, Percent, Plus, Receipt, Scale, Settings, ShieldCheck, ShoppingCart, Smartphone,
  Tractor, TrendingUp, Truck, Upload, Download, User, Users, Wallet, Wrench, Globe, Zap, type LucideIcon,
} from "lucide-react";
import type { IconKey } from "../_lib/nav";

const ICONS: Record<IconKey, LucideIcon> = {
  home: House, inbox: Inbox, cart: ShoppingCart, users: Users, tractor: Tractor, box: Package, truck: Truck, wrench: Wrench,
  wallet: Wallet, scale: Scale, receipt: Receipt, trend: TrendingUp, chart: ChartColumn, banknote: Banknote, news: Newspaper,
  percent: Percent, bank: Landmark, globe: Globe, gear: Settings, user: User, key: KeyRound, palette: Palette, bell: Bell,
  logout: LogOut, swap: ArrowLeftRight, list: List, shield: ShieldCheck, building: Building2, briefcase: Briefcase,
  megaphone: Megaphone, plus: Plus, upload: Upload, download: Download, smartphone: Smartphone, book: BookOpen, zap: Zap,
};

export function Icon({ name, size = 18, strokeWidth, className }: { name: IconKey; size?: number; strokeWidth?: number; className?: string }) {
  const Cmp = ICONS[name];
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}
