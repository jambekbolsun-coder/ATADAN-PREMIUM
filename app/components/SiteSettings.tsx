"use client";
import { createContext,useContext } from "react";
import { defaultSettings,type SiteSettings } from "../lib/site-settings-types";
const Context=createContext<SiteSettings>(defaultSettings);
export function SiteSettingsProvider({children,value}:{children:React.ReactNode;value:SiteSettings}){return <Context.Provider value={value}>{children}</Context.Provider>;}
export function useSiteSettings(){return useContext(Context);}
