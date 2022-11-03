import { defineConfig } from 'vite'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import Markdown from './plugins/md-loader'
import Binary from './plugins/binary-loader'

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env': process.env
  },
  build: {
    //target: 'es2019',
    lib: {
      entry: resolve(__dirname, 'src/main.js'),
      name: 'andbrowser',
      // the proper extensions will be added
      fileName: 'andbrowser'
    },
  },
  plugins: [
    vue(),
    Markdown(),
    Binary(),
  ],
  assetsInclude: ["**/*.md", "**/*.jar"],
})
