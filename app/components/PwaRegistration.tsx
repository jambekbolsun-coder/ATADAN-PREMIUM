"use client";
import { useEffect } from "react";
export function PwaRegistration({admin=false}:{admin?:boolean}){useEffect(()=>{if("serviceWorker" in navigator&&location.protocol==="https:")void navigator.serviceWorker.register(admin?"/admin-sw.js":"/sw.js",{scope:admin?"/admin/":"/"})},[admin]);return null}
