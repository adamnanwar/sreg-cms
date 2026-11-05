// PM2: satu proses saja (jangan cluster). Job sinkron Loyverse dan kedaluwarsa pesanan berjalan di dalam proses ini.
// Variabel aplikasi dibaca Next.js dari .env di folder proyek.
const path = require('node:path')

module.exports = {
  apps: [
    {
      name: 'sreg-cms',
      cwd: path.resolve(__dirname, '..'),
      script: 'node_modules/next/dist/bin/next',
      args: `start -p ${process.env.APP_PORT || 3000}`,
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--no-deprecation',
      },
    },
  ],
}
