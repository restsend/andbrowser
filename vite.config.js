import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Markdown from './plugins/md-loader'
import Binary from './plugins/binary-loader'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    Markdown(),
    Binary(),
  ],
  assetsInclude: ["**/*.md","**/*.jar"],
})
