import type { GlobalConfig } from 'payload'

import { isAdminOrEditor, publishedOrStaff } from '../access'
import { triggerRebuildGlobal } from '../hooks/triggerRebuild'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  versions: { drafts: true, max: 25 },
  access: { read: publishedOrStaff, update: isAdminOrEditor },
  hooks: { afterChange: [triggerRebuildGlobal] },
  fields: [
    { name: 'siteName', type: 'text', defaultValue: 'sregcoffee' },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    { name: 'favicon', type: 'upload', relationTo: 'media' },
    { name: 'tagline', type: 'text', localized: true, defaultValue: 'Made for everyday grind' },
    {
      name: 'ticker',
      type: 'array',
      maxRows: 6,
      localized: true,
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    { name: 'instagramHandle', type: 'text', defaultValue: '@sregcoffee' },
    {
      name: 'socials',
      type: 'array',
      fields: [
        {
          name: 'platform',
          type: 'select',
          required: true,
          options: ['instagram', 'whatsapp', 'tiktok', 'facebook', 'youtube', 'x'],
        },
        { name: 'url', type: 'text', required: true },
      ],
    },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'text' },
        { name: 'whatsapp', type: 'text' },
      ],
    },
    { name: 'address', type: 'textarea', localized: true },
    {
      name: 'coordinates',
      type: 'group',
      fields: [
        { name: 'lat', type: 'number' },
        { name: 'lng', type: 'number' },
      ],
    },
    {
      name: 'openingHours',
      type: 'group',
      fields: [
        { name: 'summary', type: 'text', localized: true },
        {
          name: 'items',
          type: 'array',
          fields: [
            { name: 'days', type: 'text', required: true },
            { name: 'hours', type: 'text', required: true },
          ],
        },
      ],
    },
    { name: 'wholesaleNote', type: 'text', localized: true },
    { name: 'copyright', type: 'text', localized: true },
    {
      name: 'seoDefaults',
      type: 'group',
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'description', type: 'textarea', localized: true },
        { name: 'image', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'analytics',
      type: 'group',
      fields: [
        { name: 'provider', type: 'select', options: ['none', 'ga4', 'plausible', 'umami'], defaultValue: 'none' },
        { name: 'measurementId', type: 'text' },
      ],
    },
    {
      name: 'cookieBanner',
      type: 'group',
      fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: false },
        { name: 'text', type: 'textarea', localized: true },
        { name: 'acceptLabel', type: 'text', localized: true },
        { name: 'declineLabel', type: 'text', localized: true },
        { name: 'policyLink', type: 'text' },
      ],
    },
    {
      name: 'freeShipping',
      type: 'group',
      admin: { description: 'Aturan ongkir saja; subtotal dihitung server dari harga Loyverse.' },
      fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: false },
        { name: 'threshold', type: 'number', min: 0 },
      ],
    },
    {
      name: 'taxNote',
      type: 'text',
      localized: true,
      admin: { description: 'Teks saja. Tarif pajak berasal dari Loyverse.' },
    },
  ],
}
