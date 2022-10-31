import {
    ChunkStream,
    ADB_SYNC_MAX_PACKET_SIZE,
    LinuxFileType,
    WrapReadableStream
} from "@yume-chan/adb";

export class FileManager {
    constructor(device) {
        this.device = device
    }

    joinPath(cwd, name) {
        if (cwd[cwd.length - 1] == '/') {
            return cwd + name
        } else {
            return cwd + '/' + name
        }
    }

    async openDir(currentPath) {
        let cwd = currentPath || '/'
        const sync = await this.device.sync();
        let filelist = []
        if (cwd != '/') {
            let vals = cwd.split('/')
            filelist.push({
                type: LinuxFileType.Directory,
                name: '..',
                path: vals.slice(0, vals.length - 1).join('/')
            })
        }

        try {
            for await (const entry of sync.opendir(cwd)) {
                if (entry.name === '.' || entry.name === '..') {
                    continue;
                }

                filelist.push({
                    name: entry.name,
                    path: this.joinPath(cwd, entry.name),
                    size: Number(entry.size),
                    type: entry.type,
                    mtime: Number(entry.mtime)
                })
            }
        } catch (e) {
            sync.dispose()
            throw e
        }
        try {
            for (let idx = 0; idx < filelist.length; idx++) {
                const item = filelist[idx];
                if (item.type == LinuxFileType.Link) {
                    const isDir = await sync.isDirectory(item.path)
                    item.type = isDir ? LinuxFileType.Directory : LinuxFileType.File
                    filelist[idx] = item
                }
            }
        } catch (e) {
            // ignore
        }

        sync.dispose()
        return filelist
    }

    async openFile(item) {
        if (item.type == LinuxFileType.Directory) { return }
        const sync = await this.device.sync();
        let data = []

        try {
            let stream = await sync.read(item.path)
            await stream.pipeTo(new WritableStream({
                write: (v) => {
                    data.push(v)
                },
            }))
        } catch (e) {
            sync.dispose()
            throw e
        }
        sync.dispose()
        return new Blob(data)
    }

    async deleteFile(itemPath) {
        await this.device.rm(itemPath);
    }

    async uploadFile(itemPath, file) {
        const sync = await this.device.sync();
        try {
            await new WrapReadableStream(file.stream())
                .pipeThrough(new ChunkStream(ADB_SYNC_MAX_PACKET_SIZE))
                .pipeTo(sync.write(
                    itemPath,
                    (LinuxFileType.File << 12) | 0o666,
                    file.lastModified / 1000,
                ));
        } catch (e) {
            sync.dispose()
            throw e
        }
        sync.dispose()
    }
}
