// @ts-check
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import react from '@astrojs/react'
import cloudflare from '@astrojs/cloudflare'
import node from '@astrojs/node'
import sentry from '@sentry/astro'

export default defineConfig({
  output: 'server',

  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['hokily-unsociological-henley.ngrok-free.dev'],
    },
  },

  integrations: [
    react(),
    sentry({
      project: 'essenz',
      org: 'bytesyncs',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  adapter: process.env.NODE_ENV === 'development' ? node({ mode: 'standalone' }) : cloudflare(),
  security: {
    checkOrigin: false,
  },
})
