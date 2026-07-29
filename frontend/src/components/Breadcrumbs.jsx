import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
export default function Breadcrumbs({items}){return <nav className="breadcrumbs"><Link to="/">ATADAN</Link>{items.map((item,i)=><span key={item.label}><ChevronRight size={14}/>{item.to&&i<items.length-1?<Link to={item.to}>{item.label}</Link>:<span>{item.label}</span>}</span>)}</nav>}
