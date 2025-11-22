
export const validateImageFile = async (file: File): Promise<boolean> => {
    const arr = new Uint8Array(await file.slice(0, 8).arrayBuffer());

    // PNG Signature: 89 50 4E 47 0D 0A 1A 0A
    const isPng = arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47 &&
                  arr[4] === 0x0D && arr[5] === 0x0A && arr[6] === 0x1A && arr[7] === 0x0A;

    // JPEG Signature: FF D8 FF ...
    const isJpeg = arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF;

    return isPng || isJpeg;
};
