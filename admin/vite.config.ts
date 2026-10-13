import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    fs: {
      strict: false,
    },
    proxy: {
      // Yokcash only answers calls from whitelisted server IPs — the local dev
      // machine (and localhost:3001) is not whitelisted, but the prod EB env is.
      // '/yc-api/*' → 'https://…/prod/api/*' lets provider test pages exercise
      // the real whitelisted path in dev. Prod builds are unaffected (same-origin
      // /api already proxies to the gateway via the Amplify rewrite).
      '/yc-api': {
        target: 'https://c4pmcbw502.execute-api.ap-south-1.amazonaws.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/yc-api/, '/prod/api'),
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react', 'recharts'],
          'utils': ['axios', 'clsx'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
    sourcemap: false,
  },
})
