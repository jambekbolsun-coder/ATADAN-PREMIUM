import { MessageCircle } from 'lucide-react'
import { whatsappUrl } from '../utils/helpers'
export default function WhatsAppFloat(){return <a className="whatsapp-float" href={whatsappUrl()} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle/></a>}
