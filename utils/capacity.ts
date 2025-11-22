
export const getByteLength = (message: string): number => {
    return new TextEncoder().encode(message).length;
};

export const calculateMaxBytes = (width: number, height: number): number => {
    const totalPixels = width * height;
    // Header (272 bits) + AES-GCM Tag (128 bits) = 400 bits overhead
    // GZIP Overhead (approx 20-30 bytes) = ~240 bits safety margin
    // Total reserved: 400 + 240 = 640 bits
    const availableBits = (totalPixels * 3) - 640;
    if (availableBits <= 0) return 0;
    return Math.floor(availableBits / 8);
};
