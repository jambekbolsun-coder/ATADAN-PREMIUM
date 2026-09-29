import { getRawDb } from "../../../../db";
import { canUseSection, requireActor } from "../../../lib/admin-auth";
import { cleanText, fail, HttpError, jsonBody, sameOrigin } from "../../../lib/security";
import { defaultChoices } from "../../../lib/workflow-options";

export async function GET(request: Request) {
  try {
    const actor=await requireActor(request), kind=new URL(request.url).searchParams.get("kind");
    const section=kind==="documents"?"documents":kind==="finance_entries"?"expenses":"";
    if(!section||!canUseSection(actor,section))throw new HttpError(403,"Нет доступа");
    const db=getRawDb(), [folders, choices]=await Promise.all([
      db.prepare("SELECT id,name,version FROM document_folders_v3 ORDER BY id").all(),
      db.prepare("SELECT field,value FROM record_options_v3 WHERE kind=? ORDER BY value").bind(kind).all<{field:string;value:string}>(),
    ]);
    const options:Record<string,string[]>={...defaultChoices};
    for(const row of choices.results)options[row.field]=Array.from(new Set([...(options[row.field]??[]),row.value]));
    return Response.json({folders:folders.results,options},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return fail(error)}
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);const actor=await requireActor(request),body=await jsonBody(request,4000),kind=cleanText(body.kind,40,true);
    if(!["documents","finance_entries"].includes(kind))throw new HttpError(400,"Неизвестный раздел");
    if(!canUseSection(actor,kind==="documents"?"documents":"expenses"))throw new HttpError(403,"Нет доступа");
    const db=getRawDb();
    if(body.action==="rename_folder"&&kind==="documents"){
      const id=cleanText(body.id,30,true),name=cleanText(body.name,80,true);
      const result=await db.prepare("UPDATE document_folders_v3 SET name=?,version=version+1 WHERE id=? AND version=?").bind(name,id,Number(body.version)).run();
      if(!result.meta.changes)throw new HttpError(409,"Папка уже изменена. Обновите страницу");
    }else if(body.action==="add_choice"){
      const field=cleanText(body.field,40,true),value=cleanText(body.value,100,true);
      if(field!==(kind==="documents"?"documentType":"expenseCategory"))throw new HttpError(400,"Неизвестное поле");
      await db.prepare("INSERT INTO record_options_v3(kind,field,value) VALUES(?,?,?) ON CONFLICT DO NOTHING").bind(kind,field,value).run();
    }else throw new HttpError(400,"Неизвестное действие");
    return Response.json({ok:true});
  }catch(error){return fail(error)}
}
