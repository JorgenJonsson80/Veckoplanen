import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'

function injectSwVersion() {
  return {
    name: 'inject-sw-version',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js')
      let build
      try {
        build = execSync('git rev-parse --short HEAD').toString().trim()
      } catch {
        build = Date.now().toString(36)
      }
      const content = readFileSync(swPath, 'utf-8').replace('__BUILD__', build)
      writeFileSync(swPath, content)
    },
  }
}

export default defineConfig({
  plugins: [react(), injectSwVersion()],
})
