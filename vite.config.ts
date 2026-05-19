import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'

import { cloudflare } from "@cloudflare/vite-plugin";

dotenv.config()

export default defineConfig({
  plugins: [react(), cloudflare()],
  server: {
    host: ['localhost'],
  },
  define: {
    __GOOGLE_CLIENT_ID__: JSON.stringify(
      Buffer.from(process.env.VITE_GOOGLE_CLIENT_ID || '').toString('base64')
    ),
    __GOOGLE_CLIENT_SECRET__: JSON.stringify(
      Buffer.from(process.env.VITE_GOOGLE_CLIENT_SECRET || '').toString('base64')
    ),
  },
})