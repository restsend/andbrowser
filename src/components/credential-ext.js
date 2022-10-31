// cspell: ignore RSASSA

import { calculateBase64EncodedLength, calculatePublicKey, calculatePublicKeyLength, decodeBase64, decodeUtf8, encodeBase64 } from "@yume-chan/adb";

export default class AdbWebCredentialExtStore {

    constructor(localStorageKey = 'private-key') {
        this.localStorageKey = localStorageKey;
        this._vals = {}
    }

    setItem(key, value) {
        return new Promise((solve, reject) => {
            let vals = {}
            vals[key] = value

            if (chrome.storage) {
                chrome.storage.local.set(vals, () => {
                    solve()
                });
            } else {
                this._vals[key] = value
                solve()
            }
        })
    }

    getItem(key) {
        return new Promise((solve, reject) => {
            if (chrome.storage) {
                chrome.storage.local.get(key, (vals) => {
                    if (vals[key]) {
                        solve(vals[key])
                    } else {
                        solve(undefined)
                    }
                });
            } else {
                solve(this._vals[key])
            }
        })
    }

    async *iterateKeys() {
        const privateKey = await this.getItem(this.localStorageKey);
        if (privateKey) {
            yield decodeBase64(privateKey);
        }
    }

    async generateKey() {
        const { privateKey: cryptoKey } = await crypto.subtle.generateKey(
            {
                name: 'RSASSA-PKCS1-v1_5',
                modulusLength: 2048,
                // 65537
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: 'SHA-1',
            },
            true,
            ['sign', 'verify']
        );

        const privateKey = new Uint8Array(await crypto.subtle.exportKey('pkcs8', cryptoKey));
        await this.setItem(this.localStorageKey, decodeUtf8(encodeBase64(privateKey)));

        // The authentication module in core doesn't need public keys.
        // It will generate the public key from private key every time.
        // However, maybe there are people want to manually put this public key onto their device,
        // so also save the public key for their convenience.
        const publicKeyLength = calculatePublicKeyLength();
        const [publicKeyBase64Length] = calculateBase64EncodedLength(publicKeyLength);
        const publicKeyBuffer = new Uint8Array(publicKeyBase64Length);
        calculatePublicKey(privateKey, publicKeyBuffer);
        encodeBase64(
            publicKeyBuffer.subarray(0, publicKeyLength),
            publicKeyBuffer
        );
        await this.setItem(this.localStorageKey + '.pub', decodeUtf8(publicKeyBuffer));

        return privateKey;
    }
}
