import { AutoPlayVideo } from './AutoPlayVideo'
import { localize } from '../lib/i18n'
import type { Locale, StoryBlock } from '../lib/types'

export function StoryRenderer({ block, locale, tractorId }: { block: StoryBlock; locale: Locale; tractorId: string }) {
  const title = localize(block.content?.title, locale); const text = localize(block.content?.text, locale); const media = block.content?.media_url
  if (block.type === 'full_video' && media) return <section className="story-video" data-reveal><AutoPlayVideo src={media} poster={block.content?.poster_url} tractorId={tractorId} locale={locale}/></section>
  if (block.type === 'full_image' && media) return <section className="story-full" data-reveal><div className="story-full__media"><img src={media} alt={title || ''} loading="lazy"/></div><div className="story-full__shade"/>{(title || text) && <div className="story-full__content">{title && <h2>{title}</h2>}{text && <p>{text}</p>}</div>}</section>
  if (block.type === 'feature_grid') return <section className="story-features" data-reveal>{title && <h2>{title}</h2>}{text && <p>{text}</p>}<div className="story-features__grid">{(block.content.features || []).map((feature, index) => <div key={index} className="story-features__item"><strong>{feature.value}</strong><p>{localize(feature.label, locale)}</p></div>)}</div></section>
  if ((block.type === 'image_text' || block.type === 'text_image') && media) { const imageFirst = block.type === 'image_text'; return <section className={`story-split ${imageFirst ? '' : 'story-split--reverse'}`} data-reveal><div className="story-split__media"><img src={media} alt={title || ''} loading="lazy"/></div><div className="story-split__content">{title && <h2>{title}</h2>}{text && <p>{text}</p>}</div></section> }
  if (block.type === 'cta') return <section className="story-cta" data-reveal>{title && <h2>{title}</h2>}{text && <p>{text}</p>}</section>
  return null
}
