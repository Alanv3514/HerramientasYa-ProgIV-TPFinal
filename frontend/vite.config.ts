import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // Tiene que coincidir con CORS_ORIGIN del backend (.env).
    port: 5174,
    strictPort: true,
  },
})
