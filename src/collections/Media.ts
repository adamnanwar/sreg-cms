import path from 'path'
import type { CollectionConfig } from 'payload'

import { isAdminOrEditor } from '../access'

const webp = { format: 'webp', options: { quality: 80 } } as const

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  admin: { useAsTitle: 'alt' },
  fields: [
    { name: 'alt', type: 'text', required: true, localized: true },
    { name: 'caption', type: 'text', localized: true },
    { name: 'credit', type: 'text' },
  ],
  upload: {
    staticDir: path.resolve(process.cwd(), process.env.MEDIA_DIR || 'media'),
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    focalPoint: true,
    imageSizes: [
      { name: 'thumb', width: 400, formatOptions: webp },
      { name: 'card', width: 800, formatOptions: webp },
      { name: 'hero', width: 1920, formatOptions: webp },
      { name: 'full', width: 2560, formatOptions: webp },
      { name: 'og', width: 1200, height: 630, position: 'centre', formatOptions: webp },
    ],
  },
}
