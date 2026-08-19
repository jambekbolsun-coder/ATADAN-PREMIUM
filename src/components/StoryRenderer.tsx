import { AutoPlayVideo } from './AutoPlayVideo'
import { localize } from '../lib/i18n'
import type { Locale, StoryBlock } from '../lib/types'

export function StoryRenderer({ block, locale, tractorId }: { block: StoryBlock; locale: Locale; tractorId: string }) {
  const title = localize(block.content?.title, locale); const text = localize(block.content?.text, locale); const media = block.content?.media_url
  if (block.type === 'full_video' && media) return <section className="mx-auto max-w-[1600px] overflow-hidden bg-black"><div className="aspect-video max-h-[900px]"><AutoPlayVideo src={media} poster={block.content?.poster_url} tractorId={tractorId} locale={locale}/></div></section>
  if (block.type === 'full_image' && media) return <section className="mx-auto max-w-[1600px]"><img src={media} alt={title || ''} className="max-h-[900px] w-full object-cover" loading="lazy"/></section>
  if (block.type === 'feature_grid') return <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(block.content.features || []).map((f,i)=><div key={i} className="rounded-[28px] bg-[#f4f7f2] p-6"><div className="text-3xl font-extrabold text-atadan-700">{f.value}</div><div className="mt-2 text-sm text-neutral-500">{localize(f.label,locale)}</div></div>)}</div></section>
  if ((block.type === 'image_text' || block.type === 'text_image') && media) { const imageFirst = block.type === 'image_text'; return <section className="mx-auto grid max-w-[1440px] items-center gap-8 px-5 py-12 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-12 lg:py-20"><div className={imageFirst?'lg:order-1':'lg:order-2'}><img src={media} alt={title || ''} className="aspect-[4/3] w-full rounded-[32px] object-cover" loading="lazy"/></div><div className={imageFirst?'lg:order-2':'lg:order-1'}>{title && <h2 className="text-3xl font-extrabold tracking-[-.035em] sm:text-5xl">{title}</h2>}{text && <p className="mt-5 max-w-xl text-base leading-7 text-neutral-600 sm:text-lg">{text}</p>}</div></section> }
  if (block.type === 'cta') return <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12"><div className="rounded-[36px] bg-atadan-500 p-8 sm:p-12"><h2 className="text-3xl font-extrabold tracking-[-.04em] sm:text-5xl">{title}</h2>{text && <p className="mt-4 max-w-2xl text-base text-[#1b330d]/75">{text}</p>}</div></section>
  return null
}
