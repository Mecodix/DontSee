import { TOTAL_OVERHEAD_BITS } from './constants';

export const getByteLength = (message: string): number => {
    return new TextEncoder().encode(message).length;
};

export const calculateMaxBytes = (width: number, height: number): number => {
    const totalPixels = width * height;
    // Total Bits = (Pixels * 3 RGB channels)
    // Available = Total - Overhead
    const availableBits = (totalPixels * 3) - TOTAL_OVERHEAD_BITS;

    if (availableBits <= 0) return 0;
    return Math.floor(availableBits / 8);
};
