import type { Field, GlobalConfig } from 'payload'

import { isAdminOrEditor, publishedOrStaff } from '../access'
import { enabledField, linkField } from '../fields/common'
import { triggerRebuildGlobal } from '../hooks/triggerRebuild'

const base = (slug: string, fields: Field[]): GlobalConfig => ({
  slug,
  versions: { drafts: true, max: 25 },
  access: { read: publishedOrStaff, update: isAdminOrEditor },
  hooks: { afterChange: [triggerRebuildGlobal] },
  fields,
})

export const Announcement = base('announcement', [
  { name: 'enabled', type: 'checkbox', defaultValue: false },
  { name: 'text', type: 'text', localized: true },
  { name: 'ctaLabel', type: 'text', localized: true },
  { name: 'ctaLink', type: 'text', admin: { description: 'Path atau URL, mis. /products' } },
  { name: 'tone', type: 'select', defaultValue: 'dark', options: ['dark', 'light'] },
  { name: 'startAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
  { name: 'endAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
])

const labelHref = (name: string): Field => ({
  name,
  type: 'array',
  fields: [
    { name: 'label', type: 'text', required: true, localized: true },
    { name: 'href', type: 'text', required: true },
  ],
})

export const Navigation = base('navigation', [
  labelHref('main'),
  labelHref('footerLinks'),
  {
    name: 'infoColumns',
    type: 'array',
    maxRows: 4,
    fields: [
      { name: 'heading', type: 'text', required: true, localized: true },
      labelHref('links'),
    ],
  },
])

export const Footer = base('footer', [
  { name: 'logo', type: 'upload', relationTo: 'media', admin: { description: 'Kosong → pakai logo site-settings' } },
  { name: 'slogan', type: 'text', localized: true },
  { name: 'marqueeText', type: 'text', localized: true },
])

export const NewsPage = base('news-page', [
  { name: 'title', type: 'text', localized: true, defaultValue: 'NEWS' },
  {
    name: 'headline',
    type: 'relationship',
    relationTo: 'articles',
    admin: { description: 'Kosong → artikel terbaru yang featured' },
  },
  {
    name: 'headlineRelated',
    type: 'relationship',
    relationTo: 'articles',
    hasMany: true,
    maxRows: 4,
    admin: { description: 'Kosong → 4 artikel terbaru berikutnya' },
  },
  { name: 'headlineBarText', type: 'text', localized: true },
])

export const FaqPage = base('faq-page', [
  { name: 'title', type: 'text', localized: true, defaultValue: 'FAQ' },
  { name: 'intro', type: 'textarea', localized: true },
])

export const ContactPage = base('contact-page', [
  { name: 'title', type: 'text', localized: true, defaultValue: 'CONTACTS' },
  { name: 'intro', type: 'textarea', localized: true },
  { name: 'showMap', type: 'checkbox', defaultValue: true },
  { name: 'showForm', type: 'checkbox', defaultValue: true },
  { name: 'formSuccessMessage', type: 'text', localized: true },
])

/** Teks UI kecil (checkout, login, keranjang, pesan error). Kunci bebas, disepakati dengan frontend. */
export const UiStrings = base('ui-strings', [
  {
    name: 'strings',
    type: 'array',
    admin: { description: 'Satu baris per teks. `key` dipakai frontend; jangan diubah sembarangan.' },
    fields: [
      { name: 'key', type: 'text', required: true, index: true },
      { name: 'value', type: 'text', required: true, localized: true },
    ],
  },
])

export const Gallery = base('gallery', [
  { name: 'title', type: 'text', localized: true, defaultValue: 'GALLERY' },
  {
    name: 'items',
    type: 'array',
    admin: { description: 'Urutan = urutan tampil. Jumlah foto bebas (opsi B).' },
    fields: [
      { name: 'image', type: 'upload', relationTo: 'media', required: true },
      { name: 'size', type: 'select', defaultValue: 'small', options: ['small', 'wide', 'tall', 'large'] },
    ],
  },
])

export const About = base('about', [
  {
    name: 'masthead',
    type: 'group',
    fields: [
      { name: 'title', type: 'text', localized: true, defaultValue: 'ABOUT' },
      { name: 'background', type: 'upload', relationTo: 'media' },
    ],
  },
  {
    name: 'intro',
    type: 'group',
    fields: [
      { name: 'heading', type: 'text', localized: true },
      { name: 'subheading', type: 'text', localized: true },
      { name: 'body', type: 'textarea', localized: true },
    ],
  },
  {
    name: 'photos',
    type: 'array',
    minRows: 4,
    maxRows: 4,
    admin: { description: 'Tepat 4 foto' },
    fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
  },
  {
    name: 'story',
    type: 'group',
    fields: [
      { name: 'title', type: 'text', localized: true, defaultValue: 'OUR STORY' },
      { name: 'body', type: 'textarea', localized: true },
    ],
  },
  {
    name: 'philosophy',
    type: 'group',
    fields: [
      { name: 'title', type: 'text', localized: true, defaultValue: 'OUR PHILOSOPHY' },
      { name: 'body', type: 'textarea', localized: true },
    ],
  },
  { name: 'band', type: 'group', fields: [{ name: 'image', type: 'upload', relationTo: 'media' }] },
  { name: 'showFeatured', type: 'checkbox', defaultValue: true, label: 'Tampilkan "BEANS U NEED TO TRY" (memakai home.featured)' },
])

export const Home = base('home', [
  {
    name: 'hero',
    type: 'group',
    fields: [
      enabledField,
      { name: 'background', type: 'upload', relationTo: 'media' },
      { name: 'mark', type: 'upload', relationTo: 'media' },
      { name: 'intro', type: 'textarea', localized: true },
      {
        name: 'stats',
        type: 'array',
        maxRows: 3,
        localized: true,
        fields: [
          { name: 'value', type: 'text', required: true },
          { name: 'label', type: 'text', required: true },
        ],
      },
      {
        name: 'chat',
        type: 'group',
        fields: [
          { name: 'enabled', type: 'checkbox', defaultValue: false },
          { name: 'href', type: 'text', admin: { description: 'Link WhatsApp' } },
          { name: 'label', type: 'text', localized: true },
        ],
      },
    ],
  },
  {
    name: 'sector',
    type: 'group',
    fields: [
      enabledField,
      { name: 'title', type: 'text', localized: true, defaultValue: 'SECTOR SELECTION' },
      {
        name: 'columns',
        type: 'array',
        maxRows: 3,
        admin: { description: 'Urutan kolom. Lencana kosong → pakai lencana kategori.' },
        fields: [
          { name: 'category', type: 'relationship', relationTo: 'product-categories', required: true },
          { name: 'badge', type: 'text', localized: true },
        ],
      },
    ],
  },
  {
    name: 'featured',
    type: 'group',
    fields: [
      enabledField,
      { name: 'title', type: 'text', localized: true },
      { name: 'subtitle', type: 'text', localized: true },
      linkField('cta'),
      { name: 'products', type: 'relationship', relationTo: 'products', hasMany: true, maxRows: 4 },
    ],
  },
  {
    name: 'roots',
    type: 'group',
    fields: [
      enabledField,
      { name: 'title', type: 'text', localized: true, defaultValue: 'Our Roots' },
      { name: 'lead', type: 'textarea', localized: true },
      { name: 'body', type: 'textarea', localized: true },
      { name: 'photo', type: 'upload', relationTo: 'media' },
      {
        name: 'visit',
        type: 'group',
        admin: { description: 'Penimpa. Kosong → pakai site-settings.' },
        fields: [
          { name: 'title', type: 'text', localized: true },
          { name: 'address', type: 'textarea', localized: true },
          { name: 'hours', type: 'text', localized: true },
          { name: 'openLabel', type: 'text', localized: true },
        ],
      },
    ],
  },
  {
    name: 'places',
    type: 'group',
    fields: [
      { name: 'map', type: 'upload', relationTo: 'media' },
      { name: 'shop', type: 'upload', relationTo: 'media' },
    ],
  },
])
