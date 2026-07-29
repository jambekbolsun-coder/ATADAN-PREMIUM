import { Helmet } from 'react-helmet-async'
export default function PageHero({eyebrow,title,lead,children,titleTag}){return <><Helmet><title>{titleTag || `${title} — ATADAN`}</title><meta name="description" content={lead}/></Helmet><section className="page-hero"><div className="container"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{lead}</p>{children}</div></section></>}
