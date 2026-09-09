import type { Metadata } from "next";
import { AdminDashboard } from "../../../components/AdminDashboard";
import type { AdminWorkspace } from "../../../components/AdminPortalHome";

export const metadata:Metadata={title:"Админ-панель | ATADAN",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";

export default async function AdminWorkspacePage({params}:{params:Promise<{workspace:string;section?:string[]}>}){
  const {workspace,section}=await params;
  const valid=(['marketing','company','control'] as const).includes(workspace as AdminWorkspace);
  return <AdminDashboard initialWorkspace={valid?workspace as AdminWorkspace:null} initialSection={section?.[0]||"overview"}/>;
}
