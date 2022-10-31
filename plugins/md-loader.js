import fs from 'node:fs'
import { compileTemplate } from '@vue/compiler-sfc'
import MarkdownIt from 'markdown-it'
const __doc__ = `
    ## How to use:

vite.config.js:
import Markdown from './plugins/md-loader'
export default defineConfig({
  plugins: [
    vue(),
    Markdown(),
  ],
  assetsInclude: ["**/*.md"]
})


in vue:

import EnableDebugContent from '../docs/enabledebug.md'

<template>
    <EnableDebugContent />
</template>

`
export function mdLoader(options = {}) {
    const mdRegex = /\.md$/
    return {
        name: 'markdown-loader',
        enforce: 'pre',

        async load(id) {
            if (!id.match(mdRegex)) {
                return
            }
            const [path, query] = id.split('?', 2)

            let data
            try {
                data = fs.readFileSync(path, 'utf-8')
            } catch (ex) {
                console.warn(ex, '\n', `${id} couldn't be loaded by vite-md-loader, fallback to default loader`)
                return
            }

            try {
                const md = new MarkdownIt();
                const result = md.render(data);
                const { code } = compileTemplate({
                    id: JSON.stringify(id),
                    source: `${result}`,
                    filename: path,
                    transformAssetUrls: false
                })
                return `${code}\nexport default { render: render }`
            } catch (ex) {
                console.warn(ex, '\n', `${id} compile markdown fail`)
                return
            }
        }
    }
}

export default mdLoader 