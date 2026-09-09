import type { Metadata } from "next";
import { LegalPage } from "../components/LegalPage";
export const metadata:Metadata={title:"Политика конфиденциальности | ATADAN",description:"Как ATADAN обрабатывает данные заявок и анонимную аналитику сайта."};
export default function PrivacyPage(){return <LegalPage kind="privacy"/>}
