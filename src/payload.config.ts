import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { ProductCategories } from './collections/ProductCategories'
import { Products } from './collections/Products'
import { LoyverseCategories, LoyverseItems } from './collections/LoyverseMenu'
import { Articles } from './collections/Articles'
import { Pages } from './collections/Pages'
import { Faqs } from './collections/Faqs'
import { SiteSettings } from './globals/SiteSettings'
import { Integrations } from './globals/Integrations'
import { About, Announcement, ContactPage, FaqPage, Footer, Gallery, Home, Navigation, NewsPage, UiStrings } from './globals/simple'
import { Customers } from './collections/Customers'
import { Cities, DiscountCodes, Districts, PaymentMethods, Provinces, ShippingMethods } from './collections/Checkout'
import { Orders } from './collections/Orders'
import { StockReservations } from './collections/StockReservations'
import {
  ContactMessages,
  EmailTemplates,
  NewsletterSubscribers,
  Returns,
  Reviews,
  StockAlerts,
  WholesaleInquiries,
} from './collections/Engagement'
import { loyverseSyncEndpoint, loyverseWebhookEndpoint } from './endpoints/loyverse'
import { publicEndpoints } from './endpoints/public'
import { syncLoyverse } from './lib/loyverse/sync'
import { expireUnpaidOrders } from './lib/payments/apply'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Origin yang boleh memanggil API: produksi, staging, dan dev frontend (Astro).
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  process.env.NEXT_PUBLIC_SERVER_URL,
  'http://localhost:4321',
].filter((o): o is string => Boolean(o))

/** Path di frontend untuk Live Preview. */
const previewPaths: Record<string, (doc: { slug?: string }) => string> = {
  products: (d) => `/products/${d.slug}`,
  articles: (d) => `/news/${d.slug}`,
  pages: (d) => `/p/${d.slug}`,
  'product-categories': () => '/products',
  faqs: () => '/faq',
  home: () => '/',
  about: () => '/about',
  gallery: () => '/gallery',
  'news-page': () => '/news',
  'faq-page': () => '/faq',
  'contact-page': () => '/contacts',
  navigation: () => '/',
  footer: () => '/',
  announcement: () => '/',
  'site-settings': () => '/',
}

const previewUrl = (slug: string, data: { slug?: string }): string => {
  const p = (previewPaths[slug] ?? (() => '/'))(data)
  const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:4321'
  return `${origin}/preview?path=${encodeURIComponent(p)}&secret=${process.env.PREVIEW_SECRET ?? ''}`
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    livePreview: {
      collections: ['products', 'articles', 'pages'],
      globals: ['home', 'about', 'gallery', 'news-page', 'faq-page', 'contact-page', 'announcement', 'navigation', 'footer', 'site-settings'],
      url: ({ data, collectionConfig, globalConfig }) =>
        previewUrl((collectionConfig?.slug ?? globalConfig?.slug) as string, data as { slug?: string }),
    },
  },
  collections: [
    Users,
    Media,
    ProductCategories,
    Products,
    LoyverseCategories,
    LoyverseItems,
    Articles,
    Pages,
    Faqs,
    Customers,
    ShippingMethods,
    PaymentMethods,
    DiscountCodes,
    Provinces,
    Cities,
    Districts,
    Orders,
    StockReservations,
    Returns,
    Reviews,
    StockAlerts,
    NewsletterSubscribers,
    ContactMessages,
    WholesaleInquiries,
    EmailTemplates,
  ],
  globals: [SiteSettings, Announcement, Navigation, Footer, Home, About, Gallery, NewsPage, FaqPage, ContactPage, UiStrings, Integrations],
  // Email: SMTP bila SMTP_HOST diisi; tanpa itu Payload hanya mencatat email ke log (dev).
  ...(process.env.SMTP_HOST
    ? {
        email: nodemailerAdapter({
          defaultFromAddress: process.env.SMTP_FROM || 'no-reply@sregcoffee.id',
          defaultFromName: 'sregcoffee',
          transportOptions: {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
          },
        }),
      }
    : {}),
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  cors: allowedOrigins,
  csrf: allowedOrigins,
  localization: {
    locales: [
      { label: 'English', code: 'en' },
      { label: 'Bahasa Indonesia', code: 'id' },
    ],
    defaultLocale: 'en',
    fallback: true,
  },
  upload: { limits: { fileSize: 5_000_000 } },
  endpoints: [loyverseSyncEndpoint, loyverseWebhookEndpoint, ...publicEndpoints],
  jobs: {
    tasks: [
      {
        slug: 'loyverse-sync',
        schedule: [{ cron: '*/5 * * * *', queue: 'loyverse' }],
        handler: async ({ req }) => {
          // Tanpa token Loyverse (mis. dev lokal) job dilewati, bukan gagal terus.
          if (!process.env.LOYVERSE_ACCESS_TOKEN) return { output: { skipped: true } }
          const r = await syncLoyverse(req.payload)
          return { output: { ...r } }
        },
      },
      {
        // Pesanan belum dibayar melewati batas → expired (hook melepas reservasi stok).
        slug: 'expire-orders',
        schedule: [{ cron: '* * * * *', queue: 'orders' }],
        handler: async ({ req }) => ({ output: { expired: await expireUnpaidOrders(req.payload) } }),
      },
    ],
    // Berjalan di proses Next.js di VPS (bukan serverless).
    autoRun: [
      { cron: '* * * * *', queue: 'loyverse', limit: 5 },
      { cron: '* * * * *', queue: 'orders', limit: 5 },
    ],
    deleteJobOnComplete: true,
  },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || process.env.DATABASE_URL || '',
    },
    // Produksi memakai migrasi (`pnpm payload migrate`), bukan push.
    push: process.env.NODE_ENV !== 'production',
  }),
  sharp,
  plugins: [
    seoPlugin({
      collections: ['products', 'articles', 'pages'],
      uploadsCollection: 'media',
      generateTitle: ({ doc }) => {
        const d = doc as { name?: string; title?: string }
        return `${d.name ?? d.title ?? ''} · sregcoffee`
      },
      // Judul/deskripsi SEO ikut dilokalisasi (en/id).
      fields: ({ defaultFields }) =>
        defaultFields.map((f) => ('type' in f && (f.type === 'text' || f.type === 'textarea') ? { ...f, localized: true } : f)),
    }),
    redirectsPlugin({ collections: ['products', 'articles', 'pages'] }),
  ],
})
