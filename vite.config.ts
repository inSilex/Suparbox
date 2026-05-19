import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  plugins: [react()],
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
