export function formatFileSize(sizeBytes: number) {
    if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
        return "0 B";
    }

    if (sizeBytes < 1024) {
        return `${sizeBytes} B`;
    }
    if (sizeBytes < 1024 * 1024) {
        return `${(sizeBytes / 1024).toFixed(1).replace(/\.0$/, "")} KB`;
    }
    return `${(sizeBytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`;
}
