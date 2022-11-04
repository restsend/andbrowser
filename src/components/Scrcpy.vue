<script setup>
import { ref } from 'vue'
import client from './scrcpyclient';

const props = defineProps({})
const emits = defineEmits(['change', 'changeSize'])
/*
    disconnected, connecting, connected
*/
const status = ref('disconnected')
const screen = ref(null)

client.addlog = (t) => {
    console.log(t)
}

client.onVideoResize = onVideoResize

async function startConnect() {
    if (status.value != 'disconnected') { return }
    status.value = 'connecting'
    emits('change', status.value)

    if (client.connected) {
        client.disconnect();
    }

    let meta = await client.pickDevice();
    if (!meta) {
        client.addlog(`[client] not foud devices`);

        emits('change', 'pickfail')
        status.value = 'disconnected'
        emits('change', status.value)
        return;
    }

    try {
        let dev = await client.connectDevice(meta);
        if (!dev) {
            emits('change', 'connectfail', meta.serial)
            client.addlog(`[client] connect device fail`);
            status.value = 'disconnected'
            emits('change', status.value, meta.serial)
            return;
        }
    } catch (e) {
        //"Device Busy, Reconnect the USB cable."
        //TODO::
        emits('change', 'devicebusy', meta.serial)

        client.addlog(`[client] connect device fail ${e.toString()}`);
        status.value = 'disconnected'
        emits('change', status.value, meta.serial)
        return;
    }

    await client.connectScrcpy(screen.value);

    status.value = 'connected'
    emits('change', status.value, meta.serial)
}

async function disconnect() {
    if (client.connected) {
        client.disconnect();
    }
    status.value = 'disconnected'

    screen.value.style.removeProperty('width')
    screen.value.style.removeProperty('height')

    emits('change', status.value)
}

async function handleBackDown(e) {
    if (status.value != 'connected') { return }
    await client.handleBackPointerDown(e);
}

async function handleBackUp(e) {
    if (status.value != 'connected') { return }
    await client.handleBackPointerUp(e);
}

async function handleHomeDown(e) {
    if (status.value != 'connected') { return }
    await client.handleHomePointerDown(e);
}

async function handleHomeUp(e) {
    if (status.value != 'connected') { return }
    await client.handleHomePointerUp(e);
}

async function handleSwitchDown(e) {
    if (status.value != 'connected') { return }
    await client.handleAppSwitchPointerDown(e);
}

async function handleSwitchUp(e) {
    if (status.value != 'connected') { return }
    await client.handleAppSwitchPointerUp(e);
}

async function toggleScreen() {
    if (status.value != 'connected') { return true }
    return await client.toggleScreen();
}

function getFileManager() {
    if (status.value != 'connected') { return true }
    return client.getFileManager()
}

async function takeScreenshot() {
    let canvas = client.getCanvas();
    if (!canvas) {
        return;
    }

    var anchor = document.createElement("a");
    anchor.href = canvas.toDataURL("image/png");
    anchor.download = `${client.deviceName
        }_${new Date().toLocaleString()}.png`;
    anchor.click();
    anchor.remove();
}

async function handleResize(e) {
    let r = screen.value.getBoundingClientRect()
    let width = e.clientX - r.x

    if (width <= 260) {
        return
    }

    let ratio = width / client.width
    let height = client.height * ratio

    changeScreenSize(width, height)
}

async function onVideoResize(width, height) {
    //      
    let landscape = width > height
    let boxWidth = width
    let boxHeight = height

    if (landscape) {
        boxHeight = height > 480 ? 480 : height
        let ratio = boxHeight / height;
        boxWidth = Math.round(ratio * width)
    } else { // Portrait            
        boxWidth = width > 320 ? 320 : width
        let ratio = boxWidth / width;
        boxHeight = Math.round(ratio * height)
    }
    width = boxWidth
    height = boxHeight

    changeScreenSize(width, height)
}

function changeScreenSize(width, height) {
    let canvas = client.getCanvas();
    if (!canvas) {
        return;
    }

    screen.value.style.width = `${width}px`
    screen.value.style.height = `${height}px`

    canvas.style.height = `${height}px`
    canvas.style.width = `${width}px`

    emits('changeSize', width, height)
}

defineExpose({
    disconnect,
    startConnect,
    handleBackDown,
    handleBackUp,
    handleHomeDown,
    handleHomeUp,
    handleSwitchDown,
    handleSwitchUp,
    toggleScreen,
    getFileManager,
    takeScreenshot,
    handleResize,
})

</script>
<template>
    <div ref="screen" :class="status != 'connected' ? 'h-full bg-gray-600' : undefined">
    </div>
</template>