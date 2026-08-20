import type { Metadata } from "next";
import { AdminDashboard } from "../components/AdminDashboard";

export const metadata: Metadata = { title: "Админ-панель | ATADAN", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function AdminPage() { return <AdminDashboard />; }
