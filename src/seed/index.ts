/**
 * Seed data contoh lengkap supaya tim LP punya isi untuk dikonsumsi (teks lorem ipsum, foto dari media/images).
 * Jalankan: pnpm seed        (idempotent: aman diulang)
 *
 * - Foto diunggah dari media/images (sekali per nama file).
 * - 13 produk contoh memakai itemId `SEED-<slug>` dan cache Loyverse palsu (harga/varian). Sinkron Loyverse
 *   melewatinya. Sebelum rilis: hapus, atau ganti itemId dengan ID item Loyverse yang sebenarnya.
 * - Konten yang sudah ada tidak ditimpa (artikel, halaman, FAQ, produk non-contoh). Global ditimpa.
 */
import path from 'node:path'

import { getPayload } from 'payload'

import config from '../payload.config'
import { recomputeRating } from '../lib/reviews'

const payload = await getPayload({ config })
const skip = { context: { skipRebuild: true } }
const IMG = path.resolve(process.cwd(), 'media/images')

// ---- Rich text (Lexical) ----
type Block = { h?: 2 | 3; p?: string; ul?: string[]; quote?: string; image?: number }
const text = (t: string) => ({ type: 'text', text: t, format: 0, detail: 0, mode: 'normal', style: '', version: 1 })
const node = (type: string, extra: Record<string, unknown>, children: unknown[]) => ({
  type,
  format: '' as const,
  indent: 0,
  version: 1,
  direction: 'ltr' as const,
  children,
  ...extra,
})
const rich = (blocks: Block[]) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: blocks.map((b) => {
      if (b.h) return node('heading', { tag: `h${b.h}` }, [text(b.p ?? '')])
      if (b.ul)
        return node('list', { listType: 'bullet', tag: 'ul', start: 1 }, b.ul.map((li, i) => node('listitem', { value: i + 1 }, [text(li)])))
      if (b.quote) return node('quote', {}, [text(b.quote)])
      if (b.image) return { type: 'upload', version: 3, format: '', relationTo: 'media', value: b.image, fields: null, id: String(b.image) }
      return node('paragraph', {}, [text(b.p ?? '')])
    }),
  },
})

const LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
const LOREM2 = 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
const LOREM3 = 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'

// ---- Foto ----
const mediaIds: Record<string, number> = {}
async function photo(file: string, alt: string) {
  const name = path.basename(file)
  const found = await payload.find({ collection: 'media', where: { filename: { equals: name } }, limit: 1, depth: 0 })
  if (found.docs[0]) return (mediaIds[file] = found.docs[0].id)
  const doc = await payload.create({ collection: 'media', data: { alt }, filePath: path.join(IMG, file), ...skip })
  return (mediaIds[file] = doc.id)
}
const logo = await photo('logo.png', 'sregcoffee logo')
const bar = await photo('photo-bar.jpg', 'Barista pouring coffee at the sregcoffee bar')
const espresso = await photo('photo-espresso.jpg', 'Espresso shot being pulled')
const beansPack = await photo('product-beans.png', 'Bag of sregcoffee roasted beans')
const studio = await photo('product-photography.png', 'sregcoffee product photography set')
const shop = await photo('shop-front.png', 'sregcoffee shop front in Batam')
const map = await photo('map.png', 'Map to the sregcoffee roastery')
const drinkImg = await photo('category-drink.png', 'Ready-to-drink coffee bottle')
const bakeryImg = await photo('category-bakery.png', 'Fresh baked goods')
const gallery: (number)[] = []
for (let i = 1; i <= 12; i++) gallery.push(await photo(`gallery/${String(i).padStart(2, '0')}.png`, `sregcoffee gallery photo ${i}`))

// ---- Kategori ----
async function category(slug: string, label: string, blurb: string, order: number, sectorImage: number, sectorBadge?: string) {
  const found = await payload.find({ collection: 'product-categories', where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  if (found.docs[0]) {
    if (!found.docs[0].sectorImage) await payload.update({ collection: 'product-categories', id: found.docs[0].id, data: { sectorImage }, ...skip })
    return found.docs[0]
  }
  return payload.create({ collection: 'product-categories', data: { slug, label, blurb, order, sectorImage, sectorBadge }, ...skip })
}
const beans = await category(
  'beans',
  'BEANS',
  'Single origins, micro-lots, and proprietary espresso roasts sealed within 24 hours of roasting.',
  1,
  beansPack,
)
const drinks = await category('drinks', 'COFFEE READY TO DRINK', 'Cold brew and ready-to-drink favourites, chilled and bottled daily.', 2, drinkImg)
const bakery = await category('bakery', 'BAKE GOODS', 'Pastries and loaves baked fresh every morning.', 3, bakeryImg, 'NEW MENU!')

// ---- Produk contoh ----
type Variant = { id: string; label: string; price: number; grams: number; soldOut?: boolean }
type Seed = {
  slug: string
  name: string
  cat: { id: number }
  image: number
  eyebrow?: string
  score?: number
  specs?: [string, string][]
  notes?: string[]
  size: string
  unit: string
  variants: Variant[]
  grind?: boolean
  isNew?: boolean
  featuredRank?: number
  facts?: [string, string][]
  hs?: string
}
const GRIND = { label: 'Grind', choices: [{ label: 'Whole beans' }, { label: 'Espresso' }, { label: 'Moka pot' }, { label: 'Filter' }] }
const two = (a: number, b: number): Variant[] => [
  { id: 'SV-250', label: '250 g', price: a, grams: 250 },
  { id: 'SV-1K', label: '1 kg', price: b, grams: 1000 },
]
const origin = (slug: string, name: string, eyebrow: string, score: number, notes: string[], proc: string, varietal: string, a: number, b: number, rank?: number, isNew = false): Seed => ({
  slug,
  name,
  cat: beans,
  image: beansPack,
  eyebrow,
  score,
  specs: [['PROCESS:', proc], ['VARIETAL', varietal]],
  notes,
  size: '250G POUCH',
  unit: '250 g',
  variants: two(a, b),
  grind: true,
  isNew,
  featuredRank: rank,
  facts: [['PRODUCER', 'Lorem Ipsum Farm'], ['ALTITUDE', '1.900 MASL'], ['VARIETAL', varietal], ['PROCESS', proc], ['CROP', '2025'], ['ROASTED FOR', 'Filter Coffee']],
  hs: '0901.21',
})
const single = (slug: string, name: string, cat: { id: number }, image: number, price: number, grams: number, hs: string): Seed => ({
  slug,
  name,
  cat,
  image,
  size: name,
  unit: '1 pc',
  variants: [{ id: `SV-${slug}`, label: '1 pc', price, grams }],
  hs,
})
const products: Seed[] = [
  origin('ethiopia-suke-quto', 'ETHIOPIA SUKE QUTO', 'GUJI, ETHIOPIA // 2000 MASL', 88.5, ['JASMINE', 'BERGAMOT', 'WHITE PEACH'], 'Washed', 'Kurume Welicho', 195000, 690000, 1, true),
  origin('kenya-kiambu-aa', 'KENYA KIAMBU AA', 'KIAMBU, KENYA // 1800 MASL', 87.5, ['BLACKCURRANT', 'GRAPEFRUIT', 'BROWN SUGAR'], 'Washed', 'SL28 / SL34', 210000, 740000, 2),
  origin('colombia-pink-bourbon', 'COLOMBIA PINK BOURBON', 'HUILA, COLOMBIA // 1750 MASL', 88, ['STRAWBERRY', 'HIBISCUS', 'HONEY'], 'Natural', 'Pink Bourbon', 225000, 790000, 3),
  origin('toraja-sapan-honey', 'TORAJA SAPAN HONEY', 'SAPAN, TORAJA // 1600 MASL', 86.5, ['CARAMEL', 'CEDAR', 'DARK CHOCOLATE'], 'Honey', 'Typica', 165000, 580000, 4),
  origin('guatemala-huehuetenango', 'GUATEMALA HUEHUETENANGO', 'HUEHUETENANGO, GUATEMALA // 1900 MASL', 86, ['CACAO', 'ORANGE ZEST', 'ALMOND'], 'Washed', 'Caturra', 185000, 650000),
  origin('sreg-house-espresso', 'SREG HOUSE ESPRESSO', 'BLEND // BRAZIL, INDONESIA', 85.5, ['HAZELNUT', 'MILK CHOCOLATE', 'TOFFEE'], 'Natural / Washed', 'Mixed', 145000, 520000, undefined, true),
  single('cold-brew-bottle', 'COLD BREW 250ML', drinks, drinkImg, 38000, 400, '2202.99'),
  single('oat-milk-latte', 'OAT MILK LATTE 250ML', drinks, drinkImg, 42000, 400, '2202.99'),
  single('americano-can', 'AMERICANO CAN 200ML', drinks, drinkImg, 28000, 300, '2202.99'),
  single('salted-caramel-brew', 'SALTED CARAMEL BREW 250ML', drinks, drinkImg, 44000, 400, '2202.99'),
  single('butter-croissant', 'BUTTER CROISSANT', bakery, bakeryImg, 32000, 120, '1905.90'),
  single('banana-bread', 'BANANA BREAD LOAF', bakery, bakeryImg, 65000, 450, '1905.90'),
  single('choc-chip-cookie', 'CHOCOLATE CHIP COOKIE', bakery, bakeryImg, 24000, 100, '1905.90'),
]

const productDocs: Record<string, { id: number }> = {}
for (const p of products) {
  const itemId = `SEED-${p.slug}`
  const data = {
    slug: p.slug,
    name: p.name,
    category: p.cat.id,
    image: p.image,
    eyebrow: p.eyebrow,
    score: p.score,
    specs: p.specs?.map(([label, value]) => ({ label, value })),
    notes: p.notes?.map((note) => ({ note })),
    size: p.size,
    unit: p.unit,
    variantLabels: p.variants.map((v) => ({ variantId: v.id, label: v.label })),
    lineOptions: p.grind ? GRIND : undefined,
    variantWeights: p.variants.map((v) => ({ variantId: v.id, weightGrams: v.grams })),
    customs: { description: p.cat === beans ? 'Roasted coffee beans' : p.cat === drinks ? 'Ready-to-drink coffee' : 'Bakery product', hsCode: p.hs, countryOfOrigin: 'ID' },
    isNew: p.isNew ?? false,
    featuredRank: p.featuredRank,
    detail: {
      eyebrow: p.eyebrow,
      summary: `${LOREM} ${LOREM2}`,
      caption: p.grind ? 'ROASTED FOR FILTER COFFEE' : 'MADE FRESH IN BATAM',
      tagline: 'LOREM IPSUM,\nFOR EVERYDAY GRIND.',
      story: `${LOREM} ${LOREM3}`,
      facts: p.facts?.map(([label, value]) => ({ label, value })),
    },
    loyverse: {
      itemId,
      active: true,
      price: Math.min(...p.variants.map((v) => v.price)),
      variants: p.variants.map((v) => ({ variantId: v.id, sku: `${p.slug}-${v.id}`.toUpperCase(), optionLabel: v.label, price: v.price, stock: 50, soldOut: v.soldOut ?? false })),
      taxIncluded: true,
      taxRate: 0,
      soldOut: false,
      lowStock: false,
      syncedAt: new Date().toISOString(),
    },
    _status: 'published' as const,
  }
  const found = await payload.find({ collection: 'products', where: { slug: { equals: p.slug } }, limit: 1, depth: 0, draft: true })
  const existing = found.docs[0]
  if (!existing) productDocs[p.slug] = await payload.create({ collection: 'products', data: data as never, ...skip })
  else if (/^(PENDING|SEED)-/.test(existing.loyverse?.itemId ?? '')) productDocs[p.slug] = await payload.update({ collection: 'products', id: existing.id, data: data as never, ...skip })
  else productDocs[p.slug] = existing
}
const pid = (slug: string) => productDocs[slug]!.id

// ---- Artikel ----
const articles: { slug: string; title: string; category: string; image: number; featured?: boolean; days: number }[] = [
  { slug: 'new-roast-new-taste', title: 'NEW ROAST NEW TASTE', category: 'ROASTERY', image: espresso, featured: true, days: 2 },
  { slug: 'meet-the-farmers-of-guji', title: 'MEET THE FARMERS OF GUJI', category: 'ORIGIN', image: studio, days: 9 },
  { slug: 'brew-guide-v60-at-home', title: 'BREW GUIDE: V60 AT HOME', category: 'GUIDE', image: bar, days: 16 },
  { slug: 'batam-roastery-open-house', title: 'BATAM ROASTERY OPEN HOUSE', category: 'EVENT', image: shop, days: 30 },
  { slug: 'why-we-roast-in-small-batches', title: 'WHY WE ROAST IN SMALL BATCHES', category: 'ROASTERY', image: gallery[2]!, days: 45 },
  { slug: 'introducing-our-bake-goods', title: 'INTRODUCING OUR BAKE GOODS', category: 'NEWS', image: bakeryImg, days: 60 },
]
for (const a of articles) {
  const found = await payload.find({ collection: 'articles', where: { slug: { equals: a.slug } }, limit: 1, depth: 0, draft: true })
  if (found.docs[0]) continue
  await payload.create({
    collection: 'articles',
    data: {
      slug: a.slug,
      title: a.title,
      category: a.category,
      excerpt: `${LOREM}`,
      image: a.image,
      featured: a.featured ?? false,
      publishedAt: new Date(Date.now() - a.days * 86_400_000).toISOString(),
      tags: [{ tag: a.category.toLowerCase() }, { tag: 'sregcoffee' }],
      body: rich([
        { p: LOREM },
        { h: 2, p: 'Lorem ipsum dolor sit amet' },
        { p: `${LOREM2} ${LOREM3}` },
        { image: gallery[(a.days % 12)]! },
        { h: 3, p: 'Consectetur adipiscing' },
        { ul: ['Sed do eiusmod tempor', 'Incididunt ut labore', 'Dolore magna aliqua'] },
        { quote: 'Ut enim ad minim veniam, quis nostrud exercitation.' },
        { p: LOREM3 },
      ]) as never,
      _status: 'published',
    } as never,
    ...skip,
  })
}

// ---- Halaman legal ----
for (const [slug, title] of [['terms', 'Terms of Service'], ['privacy', 'Privacy Policy'], ['shipping-returns', 'Shipping & Returns']] as const) {
  const found = await payload.find({ collection: 'pages', where: { slug: { equals: slug } }, limit: 1, depth: 0, draft: true })
  if (found.docs[0]) continue
  await payload.create({
    collection: 'pages',
    data: { slug, title, body: rich([{ p: LOREM }, { h: 2, p: '1. Lorem ipsum' }, { p: LOREM2 }, { h: 2, p: '2. Dolor sit amet' }, { ul: ['Consectetur adipiscing', 'Sed do eiusmod'] }, { p: LOREM3 }]) as never, _status: 'published' } as never,
    ...skip,
  })
}

// ---- FAQ ----
const faqs: [string, string, 'ordering' | 'shipping' | 'payment' | 'products' | 'wholesale'][] = [
  ['How do I place an order?', 'Add your favourite beans to the cart, then follow the checkout steps. Lorem ipsum dolor sit amet.', 'ordering'],
  ['Can I change or cancel my order?', 'You can cancel while the order is awaiting payment or paid but not yet shipped.', 'ordering'],
  ['How long does shipping take?', 'Orders ship on business days (Mon–Fri). JNE REG takes 2–3 business days.', 'shipping'],
  ['Do you ship internationally?', 'Yes, to selected countries across Southeast Asia and beyond. Rates are shown at checkout.', 'shipping'],
  ['Which payment methods do you accept?', 'Credit and debit cards, bank transfer (virtual account), and QRIS.', 'payment'],
  ['When are the beans roasted?', 'Beans are roasted to order and sealed within 24 hours of roasting.', 'products'],
  ['What grind should I choose?', 'Choose Filter for V60 and drip, Espresso for machines, Moka pot for stovetop, or whole beans to grind at home.', 'products'],
  ['Do you offer wholesale?', 'Yes. Send us a message through the wholesale form and we will get back to you.', 'wholesale'],
]
for (const [i, [q, a, category]] of faqs.entries()) {
  const exists = await payload.find({ collection: 'faqs', where: { question: { equals: q } }, limit: 1, depth: 0 })
  if (!exists.docs[0]) await payload.create({ collection: 'faqs', data: { question: q, answer: rich([{ p: a }]) as never, category, order: i }, ...skip })
}

// ---- Checkout: pengiriman, pembayaran, diskon ----
const upsertBy = async (collection: 'shipping-methods' | 'payment-methods', slug: string, data: Record<string, unknown>) => {
  const found = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  if (!found.docs[0]) await payload.create({ collection, data: { slug, ...data } as never })
}
await upsertBy('shipping-methods', 'jne-reg', { name: 'JNE REG', etaText: 'Estimated delivery: 2–3 business days', daysLabel: '2-3 business days', minDays: 2, maxDays: 3, price: 20000, order: 1 })
await upsertBy('shipping-methods', 'jne-yes', { name: 'JNE YES', etaText: 'Estimated delivery: 1 business day', daysLabel: '1 business day', minDays: 1, maxDays: 1, price: 35000, order: 2 })
await upsertBy('payment-methods', 'card', { name: 'Credit / debit card', detail: 'Visa, Mastercard and JCB', type: 'card', fee: 0, order: 1 })
await upsertBy('payment-methods', 'bank-transfer', { name: 'Bank transfer', detail: 'Virtual account', type: 'virtual_account', fee: 0, order: 2 })
await upsertBy('payment-methods', 'qris', { name: 'QRIS', detail: 'Scan with any e-wallet or mobile banking', type: 'qris', fee: 0, order: 3 })
if (!(await payload.find({ collection: 'discount-codes', where: { code: { equals: 'SREG10' } }, limit: 1 })).docs[0]) {
  await payload.create({ collection: 'discount-codes', data: { code: 'SREG10', type: 'percent', value: 10, active: true } })
}

// ---- Pelanggan contoh + ulasan (disetujui) ----
const demoEmail = 'demo@sregcoffee.test'
let customer = (await payload.find({ collection: 'customers', where: { email: { equals: demoEmail } }, limit: 1, depth: 0 })).docs[0]
if (!customer) {
  customer = await payload.create({
    collection: 'customers',
    data: { email: demoEmail, name: 'Demo Customer', password: 'Demo12345', _verified: true } as never,
    disableVerificationEmail: true,
  })
}
const reviews: [string, number, string][] = [
  ['ethiopia-suke-quto', 5, 'Bright and floral'],
  ['ethiopia-suke-quto', 4, 'Lovely jasmine notes'],
  ['kenya-kiambu-aa', 5, 'Juicy and clean'],
  ['sreg-house-espresso', 4, 'Great with milk'],
]
for (const [slug, rating, title] of reviews) {
  const product = pid(slug)
  const dup = await payload.find({ collection: 'reviews', where: { and: [{ product: { equals: product } }, { title: { equals: title } }] }, limit: 1, depth: 0 })
  if (!dup.docs[0]) await payload.create({ collection: 'reviews', data: { product, customer: customer.id, rating, title, body: LOREM, status: 'approved' } as never, overrideAccess: true })
}

// Ulang-jalan menimpa produk contoh lewat versi, jadi rata-rata ulasan dihitung ulang di sini.
for (const slug of new Set(reviews.map(([s]) => s))) await recomputeRating(payload, pid(slug))

// ---- Globals ----
const publish = { _status: 'published' as const }
const setGlobal = (slug: string, data: Record<string, unknown>, status: Record<string, unknown> = publish) =>
  payload.updateGlobal({ slug: slug as never, data: { ...data, ...status } as never, ...skip })

await setGlobal('site-settings', {
  siteName: 'sregcoffee',
  tagline: 'Made for everyday grind',
  ticker: [{ text: 'Batam Roastery Est. 2020' }, { text: 'Speciality Coffee Grade SCA 86+' }, { text: '#MadeForEveryGrind' }],
  instagramHandle: '@sregcoffee',
  socials: [{ platform: 'instagram', url: 'https://instagram.com/sregcoffee' }],
  contact: { email: 'sregcoffee@gmail.com' },
  address: 'Perumahan Mediterania, Jl. Mediterania No.7A Blok JJ 1, Baloi Permai, Batam Kota, Batam City, Riau Islands 29463',
  openingHours: { summary: 'OPEN DAILY', items: [{ days: 'Daily', hours: '07:30 - 22:00 WIB • Dine-in & Bean Refills' }] },
  wholesaleNote: 'Roastery visits for wholesale accounts by appointment, please contact us first (:',
  copyright: 'copyright © sregcoffee 2026',
  taxNote: 'All prices include applicable taxes.',
})
await setGlobal('announcement', { enabled: true, text: 'FLASH SALE - 20% OFF ALL BEANS', ctaLabel: 'SHOP NOW', ctaLink: '/products', tone: 'dark' })
await setGlobal('navigation', {
  main: [{ label: 'HOME', href: '/' }, { label: 'ABOUT', href: '/about' }, { label: 'PRODUCTS', href: '/products' }, { label: 'CONTACTS', href: '/contacts' }],
  footerLinks: [{ label: 'NEWS & UPDATE', href: '/news' }, { label: 'GALLERY', href: '/gallery' }, { label: 'FAQ', href: '/faq' }, { label: 'CONTACT US', href: '/contacts' }],
  infoColumns: [
    { heading: 'SHOP', links: [{ label: 'MENU', href: '/products' }, { label: 'PRODUCTS', href: '/products' }] },
    { heading: 'INFORMATION', links: [{ label: 'NEWS & UPDATE', href: '/news' }, { label: 'GALLERY', href: '/gallery' }, { label: 'FAQ', href: '/faq' }, { label: 'CONTACT US', href: '/contacts' }] },
  ],
})
await setGlobal('footer', { logo, slogan: 'Made for everyday grind', marqueeText: 'instagram @sregcoffee - ' })
await setGlobal('home', {
  hero: {
    background: bar,
    mark: logo,
    intro: 'Meticulously roasted single-origin coffees and ready-to-drink essentials crafted inside our flagship roastery in Batam, Indonesia. Engineered for clarity, dynamic acidity, and everyday ritual.',
    stats: [{ value: '88.5%', label: 'AVG CUPPING SCORE' }, { value: '100%', label: 'DIRECT ETHNICAL SOURCING' }, { value: '<7d', label: 'ROAST TO DOOR' }],
    chat: { enabled: true, href: 'https://wa.me/6281234567890', label: 'Chat with us' },
  },
  sector: { title: 'SECTOR SELECTION', columns: [{ category: beans.id }, { category: drinks.id }, { category: bakery.id }] },
  featured: {
    title: 'BEANS U NEED TO TRY',
    subtitle: '//SALE NOW 20% OFF/BUY 3 GET 1',
    cta: { label: 'ALL PRODUCTS', href: '/products' },
    products: [pid('ethiopia-suke-quto'), pid('kenya-kiambu-aa'), pid('colombia-pink-bourbon'), pid('toraja-sapan-honey')],
  },
  roots: {
    title: 'Our Roots',
    lead: LOREM,
    body: `${LOREM2} ${LOREM3}`,
    photo: shop,
    visit: { title: 'BAR VISIT?', hours: '07:30 - 22:00 WIB • Dine-in & Bean Refills', openLabel: 'OPEN DAILY' },
  },
  places: { map, shop },
})
await setGlobal('about', {
  masthead: { title: 'ABOUT', background: studio },
  intro: { heading: 'SREGCOFFEE WAS LOREM IPSUM DOLOR SIT AMET', subheading: "Where we're from?", body: `${LOREM} ${LOREM2}` },
  photos: [gallery[0], gallery[1], gallery[2], gallery[3]].map((image) => ({ image })),
  story: { title: 'OUR STORY', body: `${LOREM} ${LOREM3}` },
  philosophy: { title: 'OUR PHILOSOPHY', body: `${LOREM2} ${LOREM3}` },
  band: { image: espresso },
})
await setGlobal('gallery', { title: 'GALLERY', items: gallery.map((image, i) => ({ image, size: (['small', 'tall', 'wide', 'large'] as const)[i % 4] })) })

const newest = (await payload.find({ collection: 'articles', where: { featured: { equals: true } }, sort: '-publishedAt', limit: 1, depth: 0 })).docs[0]
const rest = (await payload.find({ collection: 'articles', sort: '-publishedAt', limit: 5, depth: 0 })).docs.filter((a) => a.id !== newest?.id).slice(0, 4)
await setGlobal('news-page', { title: 'NEWS', headline: newest?.id, headlineRelated: rest.map((a) => a.id), headlineBarText: 'LATEST FROM THE ROASTERY' })
await setGlobal('faq-page', { title: 'FAQ', intro: LOREM })
await setGlobal('contact-page', { title: 'CONTACTS', intro: LOREM, showMap: true, showForm: true, formSuccessMessage: 'Thanks! We will get back to you soon.' })
await setGlobal('ui-strings', {
  strings: [
    ['cart.title', 'Your cart'],
    ['cart.empty', 'Your cart is empty'],
    ['checkout.title', 'Checkout'],
    ['checkout.placeOrder', 'Place order'],
    ['login.title', 'Sign in'],
    ['error.generic', 'Something went wrong. Please try again.'],
  ].map(([key, value]) => ({ key, value })),
})

payload.logger.info('Seed selesai.')
process.exit(0)
