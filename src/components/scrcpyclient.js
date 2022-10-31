import {
    Adb,
    ChunkStream,
    WrapReadableStream,
    InspectStream,
    ADB_SYNC_MAX_PACKET_SIZE
} from "@yume-chan/adb";

import {
    DEFAULT_SERVER_PATH,
    ScrcpyClient,
    ScrcpyOptions1_24,
    CodecOptions,
    pushServer,
    ScrcpyLogLevel,
    WebCodecsDecoder,
    ScrcpyVideoOrientation,
    AndroidKeyCode,
    AndroidKeyEventAction,
    AndroidMotionEventAction
} from "@yume-chan/scrcpy";

import AdbWebUsbBackend from "@yume-chan/adb-backend-webusb";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";
import AdbWebCredentialExtStore from "./credential-ext"
import Struct from "@yume-chan/struct"

import { FileManager } from "./fsutil";

const SCRCPY_SERVER_VERSION = "1.24";
/*
import SCRCPY_SERVER_URL from "../assets/scrcpy-server-v1.24.jar";
await fetch(SCRCPY_SERVER_URL)
      .then(response => new WrapReadableStream(response.body))
      .then(stream => stream.pipeTo(pushServer(this.device)));
*/

import SCRCPY_SERVER_BIN from "../assets/scrcpy-server-v1.24.jar?binary";

const SCREEN_POWER_MODE_OFF = 0;
const SCREEN_POWER_MODE_NORMAL = 2;
const SetScreenPowerMode = 10;

function clamp(value, min, max) {
    if (value < min) {
        return min;
    }

    if (value > max) {
        return max;
    }
    return value;
}
const ScrcpySetPowerModeControlMessage = new Struct()
    .uint8('type')
    .uint8('mode')

class KeyRepeater {
    constructor(key, client, delay = 0, interval = 0) {
        this.key = key;
        this.client = client;

        this.delay = delay;
        this.interval = interval;
    }

    async press() {
        await this.client.injectKeyCode({
            action: AndroidKeyEventAction.Down,
            keyCode: this.key,
            repeat: 0,
            metaState: 0,
        });

        if (this.delay === 0) {
            return;
        }

        const timeoutId = setTimeout(async () => {
            await this.client.injectKeyCode({
                action: AndroidKeyEventAction.Down,
                keyCode: this.key,
                repeat: 1,
                metaState: 0,
            });

            if (this.interval === 0) {
                return;
            }

            const intervalId = setInterval(async () => {
                await this.client.injectKeyCode({
                    action: AndroidKeyEventAction.Down,
                    keyCode: this.key,
                    repeat: 1,
                    metaState: 0,
                });
            }, this.interval);
            this.onRelease = () => clearInterval(intervalId);
        }, this.delay);
        this.onRelease = () => clearTimeout(timeoutId);
    }

    async release() {
        if (this.onRelease) {
            this.onRelease();
        }

        await this.client.injectKeyCode({
            action: AndroidKeyEventAction.Up,
            keyCode: this.key,
            repeat: 0,
            metaState: 0,
        });
    }
}


class ScpyClient {
    constructor() {
        this.deviceName = ''
        this.canvas = undefined
        this.parent = undefined
        this.device = undefined
        this.credentialStore = undefined

        if (typeof chrome !== "undefined" && chrome.runtime != undefined) {
            this.credentialStore = new AdbWebCredentialExtStore()
        } else {
            this.credentialStore = new AdbWebCredentialStore();
        }

        this.bitRatesCount = 0
        this.bitRatesTimerId = setInterval(() => {
            this.bitRatesCount = 0;
        }, 1000);
        this.decoder = undefined;
        this.logLevel = ScrcpyLogLevel.Debug;
        this.maxSize = 0
        this.bitRate = 8_000_000
        this.client = undefined

        this.homeKeyRepeater = undefined
        this.appSwitchKeyRepeater = undefined
        this.screenOn = undefined

        this.supported = AdbWebUsbBackend.isSupported();
        this.onVideoResize = (width, height) => { }
    }

    get connected() {
        // return true
        return this.client != undefined
    }

    createCanvas(parent) {
        if (this.decoder) {
            this.canvas = undefined;
            parent.removeChild(this.decoder.renderer)
        }
        this.parent = parent

        this.decoder = new WebCodecsDecoder();
        parent.appendChild(this.decoder.renderer);
        this.canvas = this.decoder.renderer;
        this.processEvents()
    }

    addlog(text) {
        let elm = document.querySelector("#logs");
        if (!elm) {
            return
        }
        let logElm = document.createElement("p");
        logElm.innerText = `${new Date().toLocaleString()} ${text}`;
        elm.appendChild(logElm);
    }

    async pickDevice() {
        let cacheDevices = (await AdbWebUsbBackend.getDevices()) || [];
        let deviceMeta = undefined;
        if (cacheDevices.length > 0) {
            deviceMeta = cacheDevices[0];
        } else {
            deviceMeta = await AdbWebUsbBackend.requestDevice();
        }
        return deviceMeta
    }

    async connectDevice(deviceMeta) {
        if (!this.device) {
            this.disconnect()
        }

        let streams = await deviceMeta.connect();
        this.addlog(`[client] authenticate ${deviceMeta.serial}`);

        this.device = await Adb.authenticate(
            streams,
            this.credentialStore,
            undefined
        );

        this.device.disconnected.then(() => {
            this.addlog("[client] disconnected done");
        });

        this.deviceName = deviceMeta.name
        return this.device;
    }

    async disconnect() {
        if (this.client) {
            this.client.close()
            this.client = undefined
        }
        if (this.device) {
            this.device.close()
            this.device = undefined
        }

        if (this.decoder && this.parent) {
            this.parent.removeChild(this.decoder.renderer)
            this.decoder.dispose()
            this.decoder = undefined
            this.parent = undefined
            this.canvas = undefined
        }
    }

    async connectScrcpy(parent) {

        await new WrapReadableStream({
            start(ctrl) {
                ctrl.enqueue(new Uint8Array(SCRCPY_SERVER_BIN));
                ctrl.close();
            },
        })
            .pipeThrough(new ChunkStream(ADB_SYNC_MAX_PACKET_SIZE))
            .pipeTo(pushServer(this.device));


        this.createCanvas(parent)

        const options = new ScrcpyOptions1_24({
            logLevel: this.logLevel,
            maxSize: this.maxSize,
            bitRate: this.bitRate,
            lockVideoOrientation: ScrcpyVideoOrientation.Unlocked,
            tunnelForward: false,
            sendDeviceMeta: false,
            sendDummyByte: false,
            codecOptions: new CodecOptions({
                profile: this.decoder.maxProfile,
                level: this.decoder.maxLevel,
            }),
        });

        this.addlog(`[client] Server arguments: ${options
            .formatServerArguments()
            .join(" ")}`);

        this.client = await ScrcpyClient.start(
            this.device,
            DEFAULT_SERVER_PATH,
            SCRCPY_SERVER_VERSION,
            options
        );

        this.client.stdout.pipeTo(
            new WritableStream({
                write: (line) => {
                    this.addlog(`${line}`);
                },
            })
        );

        this.client.videoStream
            .pipeThrough(
                new InspectStream((packet) => {
                    if (packet.type === "configuration") {
                        const {
                            croppedWidth,
                            croppedHeight
                        } = packet.data;

                        this.width = croppedWidth
                        this.height = croppedHeight
                        this.onVideoResize(this.width, this.height);

                        this.addlog(
                            `[client] Video size changed: ${croppedWidth}x${croppedHeight}`
                        );
                    } else {
                        this.bitRatesCount += packet.data.length;
                    }
                })
            )
            .pipeTo(this.decoder.writable);

        this.homeKeyRepeater = new KeyRepeater(AndroidKeyCode.Home, this.client);
        this.appSwitchKeyRepeater = new KeyRepeater(AndroidKeyCode.AppSwitch, this.client);
        this.screenOn = undefined
        await this.toggleScreen()
    }

    calculatePointerPosition(clientX, clientY) {
        const view = this.canvas.getBoundingClientRect()
        const pointerViewX = clientX - view.x
        const pointerViewY = clientY - view.y
        const pointerScreenX = clamp(pointerViewX / view.width, 0, 1) * this.width
        const pointerScreenY = clamp(pointerViewY / view.height, 0, 1) * this.height

        return {
            x: pointerScreenX,
            y: pointerScreenY,
        };
    }

    async injectTouch(action, e) {
        if (!this.client) {
            return;
        }

        const {
            x,
            y
        } = this.calculatePointerPosition(e.clientX, e.clientY);

        await this.client.injectTouch({
            action,
            pointerId: e.pointerType === "mouse" ? BigInt(-1) : BigInt(e.pointerId),
            pointerX: x,
            pointerY: y,
            pressure: e.pressure * 65535,
            buttons: e.buttons,
        });
    };

    async handlePointerDown(e) {
        if (!this.client) {
            return
        }
        this.parent.focus();
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        await this.injectTouch(AndroidMotionEventAction.Down, e);
    }

    async handlePointerUp(e) {
        if (!this.client) {
            return
        }
        await this.injectTouch(AndroidMotionEventAction.Up, e);
    }

    async handlePointerMove(e) {
        await this.injectTouch(
            e.buttons === 0 ? AndroidMotionEventAction.HoverMove : AndroidMotionEventAction.Move,
            e
        );
    }

    async handleWheel(e) {
        if (!this.client) {
            return
        }
        e.preventDefault();
        e.stopPropagation();

        const {
            x,
            y
        } = this.calculatePointerPosition(e.clientX, e.clientY);
        this.client.injectScroll({
            pointerX: x,
            pointerY: y,
            scrollX: -Math.sign(e.deltaX),
            scrollY: -Math.sign(e.deltaY),
            buttons: 0,
        });
    }

    async handleBackPointerDown(e) {
        if (e.button !== 0 || !this.client) {
            return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        await this.client.pressBackOrTurnOnScreen(AndroidKeyEventAction.Down);
    }

    async handleBackPointerUp(e) {
        if (e.button !== 0 || !this.client) {
            return;
        }
        await this.client.pressBackOrTurnOnScreen(AndroidKeyEventAction.Up);
    }

    async handleHomePointerDown(e) {
        if (e.button !== 0 || !this.client) {
            return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        await this.homeKeyRepeater.press();
    }

    async handleHomePointerUp(e) {
        if (e.button !== 0 || !this.client) {
            return;
        }
        await this.homeKeyRepeater.release();
    }

    async handleAppSwitchPointerDown(e) {
        if (e.button !== 0 || !this.client) {
            return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        await this.appSwitchKeyRepeater.press();
    }

    async handleAppSwitchPointerUp(e) {
        if (e.button !== 0 || !this.client) {
            return;
        }
        await this.appSwitchKeyRepeater.release();
    }

    async toggleScreen() {
        if (!this.client) {
            return true;
        }

        let mode = SCREEN_POWER_MODE_OFF
        if (!this.screenOn) {
            mode = SCREEN_POWER_MODE_NORMAL
            this.screenOn = true
        } else {
            this.screenOn = false
        }

        const controlStream = this.client.checkControlStream('setScreenPowerMode');
        const buffer = ScrcpySetPowerModeControlMessage.serialize({
            type: SetScreenPowerMode,
            mode,
        });

        if (buffer) {
            await controlStream.write(buffer);
        }
        return this.screenOn
    }

    getCanvas() {
        if (!this.client) {
            return
        }
        return this.canvas
    }

    getFileManager() {
        if (!this.client) {
            return
        }
        return new FileManager(this.device)
    }

    async handleKey(e) {
        if (!this.client) {
            return
        }

        e.preventDefault();

        const {
            key
        } = e;
        switch (key) {
            case "Escape":
                await this.client.pressBackOrTurnOnScreen(AndroidKeyEventAction.Down);
                await this.client.pressBackOrTurnOnScreen(AndroidKeyEventAction.Up);
                return
            case "Enter":
            case "Shift":
            case "Control":
            case "Alt":
                return
        }

        const keyCode = {
            Backspace: AndroidKeyCode.Delete,
            Space: AndroidKeyCode.Space,
        }[key]

        if (keyCode) {
            await this.client.injectKeyCode({
                action: AndroidKeyEventAction.Down,
                keyCode,
                metaState: 0,
                repeat: 0,
            });
            await this.client.injectKeyCode({
                action: AndroidKeyEventAction.Up,
                keyCode,
                metaState: 0,
                repeat: 0,
            });
        } else {
            this.client.injectText(key);
        }
    }

    processEvents() {
        this.emitKey = (evt) => {
            this.handleKey(evt)
        }
        this.bindKeyEvents = () => {
            this.canvas.focus();
            document.body.addEventListener('keydown', this.emitKey, true);
        }

        this.unbindKeyEvents = () => {
            document.body.removeEventListener('keydown', this.emitKey, true);
        }

        this.canvas.addEventListener('pointerdown', e => {
            return this.handlePointerDown(e)
        }, false);
        this.canvas.addEventListener('pointerup', e => {
            return this.handlePointerUp(e)
        }, false);
        this.canvas.addEventListener('pointermove', e => {
            return this.handlePointerMove(e)
        }, false);
        this.canvas.addEventListener('contextmenu', e => {
            e.preventDefault();
        }, false);
        this.canvas.addEventListener('wheel', e => {
            return this.handleWheel(e);
        }, false);

        this.canvas.addEventListener('mouseenter', e => {
            this.bindKeyEvents()
        }, false);
        this.canvas.addEventListener('mouseleave', e => {
            this.unbindKeyEvents()
        }, false);
    }


}
const client = new ScpyClient()
export default client