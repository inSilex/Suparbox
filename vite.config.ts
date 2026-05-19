import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

export default defineConfig({
  plugins: [react(), {
    name: 'verification-file',
    closeBundle() {
      const filename = process.env.VERIFICATION_FILENAME
      const content = process.env.VERIFICATION_CONTENT
      if (filename && content) {
        fs.writeFileSync(path.resolve('dist', filename), content, 'utf-8')
      }
    },
  }],
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
