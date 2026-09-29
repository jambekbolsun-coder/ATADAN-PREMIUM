import { requireActor } from "../../lib/admin-auth";
import { fail, HttpError } from "../../lib/security";

const manifest={
  name:"ATADAN CRM",
  short_name:"ATADAN CRM",
  description:"Рабочее пространство ATADAN: CRM, склад, задачи и финансы.",
  id:"/admin/",
  start_url:"/admin/",
  scope:"/admin/",
  display:"standalone",
  background_color:"#071c10",
  theme_color:"#071c10",
  icons:[
    {src:"/icons/atadan-app-192.png",sizes:"192x192",type:"image/png",purpose:"any"},
    {src:"/icons/atadan-app-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"},
  ],
};

export async function GET(request:Request){
  try {
    const actor=await requireActor(request);
    if(actor.role!=="owner")throw new HttpError(403,"Установка доступна только владельцу");
    return Response.json(manifest,{headers:{"Cache-Control":"private, no-store"}});
  } catch (error) {
    return fail(error);
  }
}
