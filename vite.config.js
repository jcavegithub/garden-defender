import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/garden-defender/', // This should match your GitHub repository name
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
