/**
 * Seed data awal dari teks di web saat ini (cms.md bagian 4 dan 10).
 * Jalankan: pnpm seed        (idempotent: aman diulang)
 *
 * Yang TIDAK di-seed: gambar (ada di repo frontend), harga/stok (dari Loyverse),
 * dan 12 dari 13 produk (datanya ada di src/data/products.ts milik frontend).
 */
import { getPayload } from 'payload'

import config from '../payload.config'

const payload = await getPayload({ config })

const lexical = (text: string) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: text.split('\n\n').map((t) => ({
      type: 'paragraph',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: [{ type: 'text', text: t, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }],
    })),
  },
})

async function upsertBySlug<C extends 'product-categories' | 'products' | 'articles' | 'pages'>(
  collection: C,
  slug: string,
  data: Record<string, unknown>,
  draft = false,
) {
  const existing = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0, draft: true })
  if (existing.docs[0]) return existing.docs[0]
  return payload.create({ collection, data: { slug, ...data } as never, draft, context: { skipRebuild: true } })
}

// ---- Kategori ----
const cat = async (slug: string, label: string, blurb: string, order: number, sectorBadge?: string) =>
  upsertBySlug('product-categories', slug, { label, blurb, order, sectorBadge })

const beans = await cat(
  'beans',
  'BEANS',
  'Single origins, micro-lots, and proprietary espresso roasts sealed within 24 hours of roasting.',
  1,
)
const drinks = await cat('drinks', 'COFFEE READY TO DRINK', '', 2)
const bakery = await cat('bakery', 'BAKE GOODS', '', 3, 'NEW MENU!')

// ---- Produk (draft; belum ada gambar & itemId Loyverse) ----
const product = (slug: string, name: string, extra: Record<string, unknown> = {}) =>
  upsertBySlug(
    'products',
    slug,
    { name, category: beans.id, loyverse: { itemId: `PENDING-${slug}` }, ...extra },
    true,
  )

const ethiopia = await product('ethiopia-suke-quto', 'ETHIOPIA SUKE QUTO', {
  eyebrow: 'GUJI, ETHIOPIA // 2000 MASL',
  score: 88.5,
  specs: [
    { label: 'PROCESS:', value: 'Washed' },
    { label: 'VARIETAL', value: 'Kurume Welicho' },
  ],
  notes: [{ note: 'JASMINE' }, { note: 'BERGAMOT' }, { note: 'WHITE PEACH' }],
  size: '250G POUCH',
  unit: '250 g',
  lineOptions: {
    label: 'Grind',
    choices: [{ label: 'Whole beans' }, { label: 'Espresso' }, { label: 'Moka pot' }, { label: 'Filter' }],
  },
  isNew: true,
  detail: {
    eyebrow: 'GUJI, ETHIOPIA / CROP 2025',
    summary: 'Red Bourbon from Primrose, ...',
    caption: 'ROASTED FOR FILTER COFFEE',
    tagline: 'FROM GUJI,\nFOR YOUR FILTER.',
    facts: [
      { label: 'PRODUCER', value: 'Primrose' },
      { label: 'LOCATION', value: 'Uraga, Oromia, Guji, Ethiopia' },
      { label: 'ALTITUDE', value: '2.020 MASL' },
      { label: 'VARIETAL', value: 'Red Bourbon' },
      { label: 'PROCESS', value: 'Mosto Fermentation' },
      { label: 'CROP', value: '2025' },
      { label: 'ROASTED FOR', value: 'Filter Coffee' },
    ],
  },
})
const kenya = await product('kenya-kiambu-aa', 'KENYA KIAMBU AA')
const colombia = await product('colombia-pink-bourbon', 'COLOMBIA PINK BOURBON')
const toraja = await product('toraja-sapan-honey', 'TORAJA SAPAN HONEY')

// ---- FAQ & artikel (placeholder, draft) ----
const faqs = [
  ['How long does shipping take?', 'Orders ship on business days (Mon–Fri). JNE REG takes 2–3 business days.'],
  ['When are the beans roasted?', 'Beans are roasted to order and sealed within 24 hours of roasting.'],
]
for (const [i, [q, a]] of faqs.entries()) {
  const exists = await payload.find({ collection: 'faqs', where: { question: { equals: q } }, limit: 1, depth: 0 })
  if (!exists.docs[0]) {
    await payload.create({
      collection: 'faqs',
      data: { question: q, answer: lexical(a) as never, category: i === 0 ? 'shipping' : 'products', order: i },
      context: { skipRebuild: true },
    })
  }
}

await upsertBySlug(
  'articles',
  'new-roast-new-taste',
  { title: 'NEW ROAST NEW TASTE', excerpt: 'Placeholder, ganti dengan konten asli.', body: lexical('Placeholder.') as never, featured: true },
  true,
)

// ---- Checkout: pengiriman, pembayaran, diskon ----
const upsertBy = async (collection: 'shipping-methods' | 'payment-methods', slug: string, data: Record<string, unknown>) => {
  const found = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  if (!found.docs[0]) await payload.create({ collection, data: { slug, ...data } as never })
}
await upsertBy('shipping-methods', 'jne-reg', {
  name: 'JNE REG',
  etaText: 'Estimated delivery: 2–3 business days',
  daysLabel: '2-3 business days',
  minDays: 2,
  maxDays: 3,
  price: 20000,
  order: 1,
})
await upsertBy('shipping-methods', 'jne-yes', {
  name: 'JNE YES',
  etaText: 'Estimated delivery: 1 business day',
  daysLabel: '1 business day',
  minDays: 1,
  maxDays: 1,
  price: 35000,
  order: 2,
})
await upsertBy('payment-methods', 'card', { name: 'Credit / debit card', detail: 'Visa, Mastercard and JCB', type: 'card', fee: 0, order: 1 })
await upsertBy('payment-methods', 'bank-transfer', { name: 'Bank transfer', detail: 'Virtual account', type: 'virtual_account', fee: 0, order: 2 })
await upsertBy('payment-methods', 'qris', { name: 'QRIS', detail: 'Scan with any e-wallet or mobile banking', type: 'qris', fee: 0, order: 3 })

if (!(await payload.find({ collection: 'discount-codes', where: { code: { equals: 'SREG10' } }, limit: 1 })).docs[0]) {
  await payload.create({ collection: 'discount-codes', data: { code: 'SREG10', type: 'percent', value: 10, active: true } })
}

// ---- Globals ----
const publish = { _status: 'published' as const }
const setGlobal = (slug: string, data: Record<string, unknown>, status: Record<string, unknown> = publish) =>
  payload.updateGlobal({ slug: slug as never, data: { ...data, ...status } as never, context: { skipRebuild: true } })

await setGlobal('site-settings', {
  siteName: 'sregcoffee',
  tagline: 'Made for everyday grind',
  ticker: [{ text: 'Batam Roastery Est. 2020' }, { text: 'Speciality Coffee Grade SCA 86+' }, { text: '#MadeForEveryGrind' }],
  instagramHandle: '@sregcoffee',
  socials: [{ platform: 'instagram', url: 'https://instagram.com/sregcoffee' }],
  contact: { email: 'sregcoffee@gmail.com' },
  address:
    'Perumahan Mediterania, Jl. Mediterania No.7A Blok JJ 1, Baloi Permai, Batam Kota, Batam City, Riau Islands 29463',
  openingHours: { summary: 'OPEN DAILY', items: [{ days: 'Daily', hours: '07:30 - 22:00 WIB • Dine-in & Bean Refills' }] },
  wholesaleNote: 'Roastery visits for wholesale accounts by appointment, please contact us first (:',
  copyright: 'copyright © sregcoffee 2026',
  taxNote: 'All prices include applicable taxes.',
})

await setGlobal('announcement', {
  enabled: true,
  text: 'FLASH SALE - 20% OFF ALL BEANS',
  ctaLabel: 'SHOP NOW',
  ctaLink: '/products',
  tone: 'dark',
})

await setGlobal('navigation', {
  main: [
    { label: 'HOME', href: '/' },
    { label: 'ABOUT', href: '/about' },
    { label: 'PRODUCTS', href: '/products' },
    { label: 'CONTACTS', href: '/contacts' },
  ],
  footerLinks: [
    { label: 'NEWS & UPDATE', href: '/news' },
    { label: 'GALLERY', href: '/gallery' },
    { label: 'FAQ', href: '/faq' },
    { label: 'CONTACT US', href: '/contacts' },
  ],
  infoColumns: [
    { heading: 'SHOP', links: [{ label: 'MENU', href: '/products' }, { label: 'PRODUCTS', href: '/products' }] },
    {
      heading: 'INFORMATION',
      links: [
        { label: 'NEWS & UPDATE', href: '/news' },
        { label: 'GALLERY', href: '/gallery' },
        { label: 'FAQ', href: '/faq' },
        { label: 'CONTACT US', href: '/contacts' },
      ],
    },
  ],
})

await setGlobal('footer', { slogan: 'Made for everyday grind', marqueeText: 'instagram @sregcoffee - ' })

await setGlobal('home', {
  hero: {
    intro:
      'Meticulously roasted single-origin coffees and ready-to-drink essentials crafted inside our flagship roastery in Batam, Indonesia. Engineered for clarity, dynamic acidity, and everyday ritual.',
    stats: [
      { value: '88.5%', label: 'AVG CUPPING SCORE' },
      { value: '100%', label: 'DIRECT ETHNICAL SOURCING' },
      { value: '<7d', label: 'ROAST TO DOOR' },
    ],
  },
  sector: { title: 'SECTOR SELECTION', columns: [{ category: beans.id }, { category: drinks.id }, { category: bakery.id }] },
  featured: {
    title: 'BEANS U NEED TO TRY',
    subtitle: '//SALE NOW 20% OFF/BUY 3 GET 1',
    cta: { label: 'ALL PRODUCTS', href: '/products' },
    products: [ethiopia.id, kenya.id, colombia.id, toraja.id],
  },
  roots: {
    title: 'Our Roots',
    visit: {
      title: 'BAR VISIT?',
      hours: '07:30 - 22:00 WIB • Dine-in & Bean Refills',
      openLabel: 'OPEN DAILY',
    },
  },
})

// About butuh tepat 4 foto → tetap draft sampai foto diunggah.
await setGlobal(
  'about',
  {
    masthead: { title: 'ABOUT' },
    intro: { heading: 'SREGCOFFEE WAS LOREM IPSUM DOLOR SIT AMET', subheading: "Where we're from?" },
    story: { title: 'OUR STORY' },
    philosophy: { title: 'OUR PHILOSOPHY' },
  },
  { _status: 'draft' },
)
await setGlobal('news-page', { title: 'NEWS' })
await setGlobal('faq-page', { title: 'FAQ' })
await setGlobal('contact-page', { title: 'CONTACTS' })
await setGlobal('gallery', { title: 'GALLERY' })

payload.logger.info('Seed selesai.')
process.exit(0)
