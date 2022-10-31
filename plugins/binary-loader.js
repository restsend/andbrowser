import fs from 'node:fs'

function toArrayBuffer(base64Data) {
    var isBrowser = typeof window !== 'undefined' && typeof window.atob === 'function'
    var binary = isBrowser ? window.atob(base64Data) : Buffer.from(base64Data, 'base64').toString('binary')
    var bytes = new Uint8Array(binary.length)

    for (var i = 0; i < binary.length; ++i) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
}

export function binaryLoader(options = {}) {
    const binRegex = /\?binary$/
    return {
        name: 'binary-loader',
        enforce: 'pre',

        async load(id) {
            if (!id.match(binRegex)) {
                return
            }
            const [path, query] = id.split('?', 2)

            let data
            try {
                data = fs.readFileSync(path)
            } catch (ex) {
                console.warn(ex, '\n', `${id} couldn't be loaded by binary-loader, fallback to default loader`)
                return
            }
            let base64Data = data.toString('base64')
            return `export default (${toArrayBuffer})("${base64Data}");`
        }
    }
}

export default binaryLoader 