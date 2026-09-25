const manifest={
  name:"ATADAN CRM",
  short_name:"ATADAN CRM",
  description:"Рабочее пространство ATADAN: CRM, склад, задачи и финансы.",
  id:"/admin",
  start_url:"/admin",
  scope:"/admin/",
  display:"standalone",
  background_color:"#071c10",
  theme_color:"#071c10",
  icons:[
    {src:"/icons/atadan-app-192.png",sizes:"192x192",type:"image/png",purpose:"any"},
    {src:"/icons/atadan-app-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"},
  ],
};

export function GET(){
  return Response.json(manifest,{headers:{"Cache-Control":"public, max-age=3600"}});
}
