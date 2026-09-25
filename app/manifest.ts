import type { MetadataRoute } from "next";

export default function manifest():MetadataRoute.Manifest{
  return {
    name:"ATADAN",
    short_name:"ATADAN",
    description:"Каталог тракторов Changfa, финансирование и сервис ATADAN в Кыргызстане.",
    id:"/",
    start_url:"/",
    scope:"/",
    display:"standalone",
    background_color:"#f4f7f2",
    theme_color:"#173d24",
    icons:[
      {src:"/icons/atadan-app-192.png",sizes:"192x192",type:"image/png",purpose:"any"},
      {src:"/icons/atadan-app-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"},
    ],
  };
}
