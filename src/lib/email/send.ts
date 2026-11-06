import type { Payload } from 'payload'

export const EMAIL_KEYS = [
  'order-created',
  'payment-received',
  'shipped',
  'cancelled',
  'return-update',
  'password-reset',
  'verify-email',
  'back-in-stock',
  'newsletter-confirm',
  'contact-received',
] as const
export type EmailKey = (typeof EMAIL_KEYS)[number]

/** Teks bawaan (en). Dipakai bila template di admin belum dibuat atau tidak aktif. Paragraf dipisah baris kosong. */
export const DEFAULT_TEMPLATES: Record<EmailKey, { subject: string; body: string }> = {
  'order-created': {
    subject: 'Order {{orderNumber}} received',
    body: 'Hi {{customerName}},\n\nThanks for your order {{orderNumber}}. Total: IDR {{total}}.\n\nWe will email you once payment is confirmed.\n\nView your order: {{orderUrl}}',
  },
  'payment-received': {
    subject: 'Payment received for {{orderNumber}}',
    body: 'Hi {{customerName}},\n\nWe received your payment for order {{orderNumber}}. We are preparing your coffee.\n\nInvoice: {{invoiceUrl}}',
  },
  shipped: {
    subject: 'Your order {{orderNumber}} is on the way',
    body: 'Hi {{customerName}},\n\nOrder {{orderNumber}} has shipped.\n\nTracking: {{trackingUrl}}',
  },
  cancelled: {
    subject: 'Order {{orderNumber}} cancelled',
    body: 'Hi {{customerName}},\n\nOrder {{orderNumber}} has been cancelled. If you already paid, we will refund you.',
  },
  'return-update': {
    subject: 'Update on your return for {{orderNumber}}',
    body: 'Hi {{customerName}},\n\nYour return request for order {{orderNumber}} is now: {{returnStatus}}.',
  },
  'password-reset': {
    subject: 'Reset your sregcoffee password',
    body: 'Hi {{customerName}},\n\nReset your password using this link: {{resetUrl}}\n\nIf you did not ask for this, you can ignore this email.',
  },
  'verify-email': {
    subject: 'Your sregcoffee verification code: {{code}}',
    body: 'Hi {{customerName}},\n\nYour verification code is {{code}}. It expires in {{minutes}} minutes.\n\nIf you did not ask for this, you can ignore this email.',
  },
  'back-in-stock': {
    subject: '{{productName}} is back in stock',
    body: 'Good news! {{productName}} is available again: {{productUrl}}',
  },
  'newsletter-confirm': {
    subject: 'Confirm your subscription',
    body: 'Please confirm your subscription to the sregcoffee newsletter: {{confirmUrl}}',
  },
  'contact-received': {
    subject: 'We received your message',
    body: 'Hi {{customerName}},\n\nThanks for contacting sregcoffee. We will get back to you soon.',
  },
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

type LexNode = {
  type?: string
  text?: string
  format?: number | string
  tag?: string
  url?: string
  listType?: string
  fields?: { url?: string }
  children?: LexNode[]
}

const nodesToHtml = (nodes: LexNode[] = []): string =>
  nodes
    .map((n) => {
      const inner = () => nodesToHtml(n.children)
      switch (n.type) {
        case 'text': {
          let t = escapeHtml(n.text ?? '')
          const f = typeof n.format === 'number' ? n.format : 0
          if (f & 1) t = `<strong>${t}</strong>`
          if (f & 2) t = `<em>${t}</em>`
          return t
        }
        case 'linebreak':
          return '<br>'
        case 'paragraph':
          return `<p>${inner()}</p>`
        case 'heading':
          return `<${n.tag ?? 'h2'}>${inner()}</${n.tag ?? 'h2'}>`
        case 'list':
          return n.listType === 'number' ? `<ol>${inner()}</ol>` : `<ul>${inner()}</ul>`
        case 'listitem':
          return `<li>${inner()}</li>`
        case 'link':
        case 'autolink': {
          const href = n.fields?.url ?? n.url ?? '#'
          return /^(https?:|mailto:|\/)/.test(href) ? `<a href="${escapeHtml(href)}">${inner()}</a>` : inner()
        }
        default:
          return inner()
      }
    })
    .join('')

export const lexicalToHtml = (state: unknown): string =>
  nodesToHtml((state as { root?: { children?: LexNode[] } } | null)?.root?.children)

/** Ganti {{key}} dengan nilai (di-escape bila `html`); kunci yang tak dikenal dihapus. */
export const fillPlaceholders = (tpl: string, vars: Record<string, string | number | undefined>, html = false): string =>
  tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => {
    const v = vars[k]
    if (v === undefined || v === null) return ''
    return html ? escapeHtml(String(v)) : String(v)
  })

const textToHtml = (text: string): string =>
  text
    .split(/\n\n+/)
    .map((p) => `<p>${p.split('\n').join('<br>')}</p>`)
    .join('')

/**
 * Susun subjek+HTML dari template admin (jika aktif) atau bawaan.
 * Placeholder di body DB diganti setelah di-render ke HTML; nilai di-escape.
 */
export async function renderEmail(
  payload: Payload,
  key: EmailKey,
  vars: Record<string, string | number | undefined>,
  locale: 'en' | 'id' = 'en',
): Promise<{ subject: string; html: string }> {
  const found = await payload.find({
    collection: 'email-templates',
    where: { and: [{ key: { equals: key } }, { active: { equals: true } }, { _status: { equals: 'published' } }] },
    limit: 1,
    depth: 0,
    locale,
    fallbackLocale: 'en',
  })
  const tpl = found.docs[0]
  const fallback = DEFAULT_TEMPLATES[key]
  const subject = fillPlaceholders(tpl?.subject || fallback.subject, vars)
  const html = tpl?.body
    ? fillPlaceholders(lexicalToHtml(tpl.body), vars, true)
    : textToHtml(fillPlaceholders(fallback.body, vars, true))
  return { subject, html }
}

/** Kirim email transaksional. Tidak pernah melempar error; mengembalikan true bila terkirim. */
export async function sendTemplateEmail(
  payload: Payload,
  key: EmailKey,
  to: string,
  vars: Record<string, string | number | undefined>,
  locale: 'en' | 'id' = 'en',
): Promise<boolean> {
  try {
    const { subject, html } = await renderEmail(payload, key, vars, locale)
    await payload.sendEmail({ to, subject, html })
    return true
  } catch (err) {
    payload.logger.error({ err, key, to }, '[email] gagal kirim')
    return false
  }
}

export const frontendUrl = (path: string): string =>
  `${(process.env.FRONTEND_ORIGIN || 'http://localhost:4321').replace(/\/$/, '')}${path}`
