
export const validateImageFile = async (file: File): Promise<boolean> => {
    // Read first 12 bytes to cover most magic numbers + some EXIF variants
    const buffer = await file.slice(0, 12).arrayBuffer();
    const arr = new Uint8Array(buffer);

    // PNG Signature: 89 50 4E 47 0D 0A 1A 0A
    const isPng = arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47 &&
                  arr[4] === 0x0D && arr[5] === 0x0A && arr[6] === 0x1A && arr[7] === 0x0A;

    // JPEG Signature: FF D8 FF ...
    // Common JPEG markers:
    // FF D8 FF DB (Samsung, etc)
    // FF D8 FF E0 (JFIF)
    // FF D8 FF E1 (Exif)
    const isJpeg = arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF;

    // WebP Signature: RIFF .... WEBP
    // Bytes 0-3: "RIFF" (52 49 46 46)
    // Bytes 8-11: "WEBP" (57 45 42 50)
    const isWebP = arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 &&
                   arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50;

    return isPng || isJpeg || isWebP;
};
