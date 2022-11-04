<script setup>
import { ref } from 'vue'
import Scrcpy from './Scrcpy.vue'
import FileManager from './FileManager.vue';
import Howto from './Howto.vue'
import {
    Bars3Icon,
    CameraIcon,
    EyeIcon,
    EyeSlashIcon,
    FolderIcon,
    HomeIcon,
    ChevronLeftIcon,
    LinkIcon,
    NoSymbolIcon,
} from '@heroicons/vue/20/solid'


const showMenu = ref(true)
const connected = ref(false)
const scrcpyRef = ref(null)
const fileManagerRef = ref(null)
const screenview = ref(null)
const fileManagerView = ref(null)
const showResize = ref(false)
const showFileManager = ref(false)

function report(name, did = undefined) {
    if (typeof gtag == 'undefined') {
        const params = did ? `?did=${did}` : ''
        try {
            fetch(`https://browserlify.com/stats/${import.meta.env.VITE_STORE}/${name}${params}`, { mode: 'no-cors' }).then(() => { })
        } catch (e) { }
        return
    }
    gtag('event', name, { event_category: import.meta.env.VITE_STORE, value: 1, did });
}

async function onDisconnect(action) {
    if (!connected.value) { return }
    await scrcpyRef.value.disconnect()
}

async function onToggleHomebar(action) {
    if (!connected.value) { return }
    action.on.value = !action.on.value
    action.toggled.value = !action.toggled.value
}

async function onTakeScreenshot(action) {
    if (!connected.value || !scrcpyRef.value) { return }

    action.loading.value = true
    await scrcpyRef.value.takeScreenshot()
    action.loading.value = false
}

async function onToggleScreen(action) {
    if (!connected.value || !scrcpyRef.value) { return }

    action.toggled.value = await scrcpyRef.value.toggleScreen()

    if (action.toggled.value) {
        action.icon.value = EyeIcon
    } else {
        action.icon.value = EyeSlashIcon
    }
}

async function onToggleFileManager(action) {
    if (!connected.value || !scrcpyRef.value) { return }

    action.on.value = !action.on.value
    action.toggled.value = !action.toggled.value
    showFileManager.value = action.on.value

    if (action.on.value) {
        let fm = scrcpyRef.value.getFileManager()
        if (!fm) {
            action.on.value = false
            action.toggled.value = false
            showFileManager.value = false
        } else {
            fileManagerRef.value.attach(fm)
            report('showfile')
        }
    }
}

function onStatus(state, did) {
    if (state == 'connected' || state == 'connecting') {
        connected.value = true
        showResize.value = true
    }

    if (state == 'disconnected') {
        connected.value = false
        showResize.value = false
        showFileManager.value = false

        screenview.value.style.removeProperty('width')
        screenview.value.style.removeProperty('height')

        fileManagerView.value.style.removeProperty('max-height')
    }

    if (state != 'disconnected') {
        report(state, did)
    }
}

function onChangeSize(width, height) {
    screenview.value.style.width = `${width}px`
    screenview.value.style.height = `${height}px`
    screenview.value.style.maxHeight = `${height}px`
}

async function onConnected() {
    if (connected.value || !scrcpyRef.value) {
        return
    }
    await scrcpyRef.value.startConnect()
}

async function handleBackDown(e) {
    if (!connected.value || !scrcpyRef.value) {
        return
    }
    await scrcpyRef.value.handleBackDown(e)

}
async function handleBackUp(e) {
    if (!connected.value || !scrcpyRef.value) {
        return
    }
    await scrcpyRef.value.handleBackUp(e)
}

async function handleHomeDown(e) {
    if (!connected.value || !scrcpyRef.value) {
        return
    }
    await scrcpyRef.value.handleHomeDown(e)

}
async function handleHomeUp(e) {
    if (!connected.value || !scrcpyRef.value) {
        return
    }
    await scrcpyRef.value.handleHomeUp(e)
}

async function handleSwitchDown(e) {
    if (!connected.value || !scrcpyRef.value) {
        return
    }
    await scrcpyRef.value.handleSwitchDown(e)
}

async function handleSwitchUp(e) {
    if (!connected.value || !scrcpyRef.value) {
        return
    }
    await scrcpyRef.value.handleSwitchUp(e)
}

let beginResize = false
function onMouseMove(e) {
    scrcpyRef.value.handleResize(e)
}

function onResizeDown(e) {
    if (!beginResize) {
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onResizeUp)
    }
    beginResize = true
}

function onResizeUp(e) {
    beginResize = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onResizeUp)
}

const actions = [
    { name: "Disconnect", tip: 'Disconnect', icon: ref(NoSymbolIcon), on: ref(false), loading: ref(false), handle: onDisconnect },
    { name: "Toggle Home Bar", tip: 'Toggle Home Bar', icon: ref(Bars3Icon), on: showMenu, toggled: ref(false), loading: ref(false), handle: onToggleHomebar },
    { name: "Take Screenshot", tip: 'Take Screenshot', icon: ref(CameraIcon), on: ref(false), loading: ref(false), handle: onTakeScreenshot },
    { name: "Toggle Screen Display", tip: 'Toggle Screen Display', icon: ref(EyeIcon), on: ref(false), toggled: ref(true), loading: ref(false), handle: onToggleScreen },
    { name: "File Manager", tip: 'File Manager', icon: ref(FolderIcon), on: ref(false), toggled: ref(false), loading: ref(false), handle: onToggleFileManager },
]

</script>
<template>
    <div class="flex">
        <div class="flex">
            <aside class="block pt-6 mr-2" style="width:40px">
                <div v-if="connected" class="space-y-2 bg-gray-200 items-center rounded-md shadow px-1 py-1">
                    <button v-for="action in actions"
                        class="group/item inline-block relative  items-center px-1 py-1 rounded hover:text-gray-800 hover:bg-gray-400"
                        :class="action.on.value ? 'bg-gray-300 text-gray-800' : 'text-gray-500'"
                        @click="action.handle(action)">
                        <span v-show="!action.loading.value">
                            <component :is="action.icon.value" class="h-6 w-6" />
                        </span>
                        <svg v-show="action.loading.value"
                            class="animate-spin h-6 w-6 text-gray-500 hover:text-gray-100"
                            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                            </circle>
                            <path class="opacity-75" fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                            </path>
                        </svg>
                        <div
                            class="absolute invisible left-full top-1/2 z-20 ml-3 -translate-y-1/2 whitespace-nowrap rounded bg-gray-900 py-[6px] px-4 text-sm font-semibold text-white  group-hover/item:visible">
                            <span
                                class="absolute  left-[-3px] top-1/2 -z-10 h-2 w-2 -translate-y-1/2 rotate-45 rounded-sm bg-gray-900 "></span>
                            {{ action.tip }}
                        </div>
                    </button>
                </div>
            </aside>
            <div ref="screenview" class="min-w-max max-w-7xl ">
                <!-- Screen area -->
                <div class="mx-auto justify-center min-h-full">
                    <div class="mx-auto rounded">
                        <div v-if="!connected" class="h-96 flex justify-center bg-gray-600 items-center">
                            <button type="button"
                                class="inline-flex items-center rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-lg font-medium text-white shadow-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                                @click="onConnected">
                                <LinkIcon class="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                                Connected
                            </button>
                        </div>
                        <Scrcpy v-show="connected" ref="scrcpyRef" @change="onStatus" @changeSize="onChangeSize" />
                    </div>
                    <!-- Home bar-->
                    <div v-if="showMenu">
                        <div class="mx-auto flex justify-center px-4 py-1 bg-black">
                            <div class="flex justify-between space-x-12">
                                <button
                                    class="relative inline-flex items-center px-1 py-1 text-gray-200 hover:text-gray-900 hover:bg-gray-100"
                                    @pointerdown="handleBackDown" @pointerup="handleBackUp">
                                    <component :is="ChevronLeftIcon" class="h-7 w-7" />
                                </button>
                                <button
                                    class="relative inline-flex items-center px-1 py-1 text-gray-200 hover:text-gray-900 hover:bg-gray-100"
                                    @pointerdown="handleHomeDown" @pointerup="handleHomeUp">
                                    <component :is="HomeIcon" class="h-7 w-7" />
                                </button>
                                <button
                                    class="relative inline-flex items-center px-1 py-1 text-gray-200 hover:text-gray-900 hover:bg-gray-100"
                                    @pointerdown="handleSwitchDown" @pointerup="handleSwitchUp">
                                    <component :is="Bars3Icon" class="h-7 w-7" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-if="showResize" class="inset-y-0 pt-12 px-2 sm:flex" style="left:320px">
                <div class=" h-8 w-1.5 rounded-full cursor-ew-resize bg-slate-400" @pointerdown="onResizeDown"></div>
            </div>
        </div>
        <Howto v-if="!connected" class="px-4" />
        <div v-show="showFileManager" class="px-4 mt-2 lg:px-8 rounded border py-2 shadow" ref="fileManagerView">
            <FileManager ref="fileManagerRef" />
        </div>
    </div>
</template>