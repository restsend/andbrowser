<script setup>

import {
    HomeIcon,
} from '@heroicons/vue/20/solid'

import {
    ArrowUpTrayIcon,
    ArrowDownTrayIcon,
    TrashIcon,
    DocumentIcon,
    FolderIcon,
} from '@heroicons/vue/24/outline'

import {
    LinuxFileType,
} from "@yume-chan/adb";

import { ref } from 'vue';

const props = defineProps(['client'])

let fm = null
let currentPath = null

function attach(val) {
    fm = val
    doChdir(currentPath).then(() => { })
}

defineExpose({
    attach,
})

const paths = ref([])
const files = ref([])

async function doUpload(e) {
    const file = e.target.files[0];
    const target = currentPath + '/' + file.name
    await fm.uploadFile(target, file)
    let item = { name: file.name, path: target, mtime: file.lastModified / 1000, size: file.size }
    files.value.push(item)
}

function splitPath(p) {
    if (p == '/') {
        return [{ name: '/', path: '/' }]
    }
    let vals = p.split('/')
    let breadcrumb = []
    let cur = ''
    for (let idx = 1; idx < vals.length; idx++) {
        const p = vals[idx];
        cur = cur + '/' + p
        breadcrumb.push({ name: p, path: cur })
    }
    return breadcrumb
}

async function doChdir(path) {
    currentPath = path || '/sdcard'
    paths.value = splitPath(currentPath)
    files.value = await fm.openDir(currentPath)
}

async function doTryChdir(item) {
    if (item.type != LinuxFileType.Directory) { return }
    return await doChdir(item.path)
}

async function doDelete(idx, item) {
    if (!confirm("Are you sure want to delete this item?")) { return }
    await fm.deleteFile(item.path)
    files.value.splice(idx, 1)
}

async function doDownload(item) {
    let fileData = await fm.openFile(item)
    if (!fileData) { return }

    var anchor = document.createElement("a");
    anchor.download = item.name;
    anchor.href = URL.createObjectURL(fileData);
    anchor.click();
    anchor.remove();
}

function renderTime(t) {
    if (t == undefined) { return '' }
    try {
        return new Date(t).toLocaleString()
    } catch {
        return ''
    }
}

function renderSize(s) {
    if (s == undefined) { return '' }
    let v = Math.round(s / 1024);
    if (v <= 0) { return `${s}B` }
    if (v < 1024) {
        return `${v.toFixed(1)}KB`
    }
    v = v / 1024
    if (v < 1024) {
        return `${v.toFixed(1)}MB`
    }
    v = v / 1024
    return `${v.toFixed(1)}G`
}

</script>
<template>
    <div class="min-w-max divide-y">
        <div class="flex">
            <nav class="flex grow mb-2" aria-label="Breadcrumb">
                <ol role="list" class="flex items-center">
                    <li>
                        <div>
                            <a href="#" @click="doChdir('/')" class="text-gray-400 hover:text-gray-500">
                                <HomeIcon class="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                                <span class="sr-only">Home</span>
                            </a>
                        </div>
                    </li>
                    <li v-for="item in paths" :key="item.path">
                        <div v-if="item.path != '/'" class="flex items-center">
                            <svg class="h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="currentColor"
                                viewBox="0 0 20 20" aria-hidden="true">
                                <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                            </svg>
                            <a href="#" @click="doChdir(item.path)"
                                class="text-sm font-medium text-gray-500 hover:text-gray-900">{{ item.name }}</a>
                        </div>
                    </li>
                </ol>
            </nav>
            <div class="flex-none">
                <div class="flex relative">
                    <input class="absolute top-0 left-0 opacity-0" type="file" @change="doUpload" />
                    <ArrowUpTrayIcon class="h-6 w-6 text-gray-500 hover:text-gray-700" />
                </div>
            </div>
        </div>
        <div class="pt-2 flex flex-col">
            <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div class="inline-block py-2 align-middle md:px-6 lg:px-8" style="max-height:600px">
                    <div class="shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                        <table class="min-w-full divide-y divide-gray-300">
                            <thead class="sticky top-0 bg-gray-50">
                                <tr>
                                    <th scope="col"
                                        class="w-96 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                        Name</th>
                                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Modify Time</th>
                                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Size</th>
                                    <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                        <span class="sr-only">Edit</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 bg-white">
                                <tr v-for="(item, idx) in files" :key="item.path" class="group/item hover:bg-slate-100">
                                    <td
                                        class="whitespace-nowrap py-2 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                        <a href="#" @click="doTryChdir(item)" class="flex space-x-1">
                                            <FolderIcon v-if="item.type == LinuxFileType.Directory"
                                                class="h-5 w-5  text-cyan-500" />
                                            <DocumentIcon v-else class="h-5 w-5 text-gray-600" />
                                            <p>{{ item.name }}</p>
                                        </a>
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                                        {{ renderTime(item.mtime) }}
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                                        {{ renderSize(item.size) }}
                                    </td>
                                    <td class="relative whitespace-nowrap py-2 pr-4 text-right text-sm font-medium ">
                                        <div class="flex space-x-1">
                                            <a href="#" @click="doDelete(idx, item)"
                                                class="invisible hover:bg-slate-200 group-hover/item:visible">
                                                <TrashIcon class="h-6 w-6" />
                                            </a>
                                            <a href="#" @click="doDownload(item)" v-if="item.type == LinuxFileType.File"
                                                class="invisible hover:bg-slate-200 group-hover/item:visible">
                                                <ArrowDownTrayIcon class="h-6 w-6" />
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>