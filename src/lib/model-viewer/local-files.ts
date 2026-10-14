export type LocalFiles = { files: File[]; paths: Map<File, string> };
export const MAX_MODEL_MIB = 512;
export const MAX_MODEL_BYTES = MAX_MODEL_MIB * 1024 * 1024;

export function exceedsModelLimit(files: Iterable<Pick<File, "size">>): boolean {
    let bytes = 0;
    for (const file of files) {
        bytes += file.size;
        if (bytes > MAX_MODEL_BYTES) return true;
    }
    return false;
}

// Capture entries synchronously: the browser protects DataTransfer after drop returns.
export function collectDroppedFiles(transfer: DataTransfer, cancelled = () => false): Promise<LocalFiles> {
    const entries = Array.from(transfer.items ?? []).filter(item => item.kind === "file")
        .map(item => ({ entry: item.webkitGetAsEntry?.(), file: item.getAsFile() }));
    const fallback = Array.from(transfer.files);
    return (async () => {
        const result: LocalFiles = { files: [], paths: new Map() };
        let bytes = 0, count = 0;
        const check = () => { if (cancelled()) throw new Error("cancelled"); };
        const add = (file: File, path: string) => {
            check(); bytes += file.size;
            if (bytes > MAX_MODEL_BYTES) throw new Error("size");
            result.files.push(file); result.paths.set(file, path);
        };
        const visit = async (entry: FileSystemEntry, parent: string, depth: number): Promise<void> => {
            check();
            if (++count > 10000 || depth > 64) throw new Error("directory");
            const path = parent + entry.name;
            if (entry.isFile) {
                const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
                add(file, path);
            } else if (entry.isDirectory) {
                const reader = (entry as FileSystemDirectoryEntry).createReader();
                for (;;) {
                    check();
                    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
                    if (!batch.length) break;
                    for (const child of batch) await visit(child, path + "/", depth + 1);
                }
            }
        };
        if (entries.length) {
            for (const item of entries) {
                if (item.entry) await visit(item.entry, "", 0);
                else if (item.file) add(item.file, item.file.webkitRelativePath || item.file.name);
                else throw new Error("directory");
            }
        } else for (const file of fallback) add(file, file.webkitRelativePath || file.name);
        return result;
    })();
}
