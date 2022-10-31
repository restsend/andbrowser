import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Markdown from './plugins/md-loader'
import Binary from './plugins/binary-loader'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { version } from './package.json'
// https://vitejs.dev/config/

export default defineConfig({
  plugins: [
    vue(),
    Markdown(),
    Binary(),
    viteStaticCopy({
      targets: [
        { src: 'src/app/background.js', dest: '.' },
        { src: 'src/assets/icon_64.png', dest: 'icons' },
        {
          src: 'src/manifest.json',
          dest: '.',
          transform: (content, fname) => {
            var obj = JSON.parse(content)
            obj.version = version
            obj.homepage_url = obj.homepage_url + process.env.VITE_STORE
            return JSON.stringify(obj, null, 2)
          },
        }
      ]
    })
  ],
  assetsInclude: ["**/*.md", "**/*.jar"],
  build: {
    rollupOptions: {
      input: 'extension.html',
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
})
