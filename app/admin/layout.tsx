import type { Metadata } from "next";

export const metadata:Metadata={
  robots:{index:false,follow:false,nocache:true,googleBot:{index:false,follow:false,noimageindex:true}},
  manifest:"/admin/manifest.webmanifest",
  appleWebApp:{capable:true,title:"ATADAN",statusBarStyle:"black-translucent"},
  other:{"apple-mobile-web-app-capable":"yes"},
  icons:{icon:"/icons/atadan-app-192.png",apple:"/icons/atadan-app-192.png"},
};

export default function AdminLayout({children}:{children:React.ReactNode}){
  return children;
}
