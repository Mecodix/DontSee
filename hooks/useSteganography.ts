
import { useState, useEffect } from 'react';
import { steganographyService } from '../services/steganographyService';

interface UseSteganographyReturn {
    isProcessing: boolean;
    resultBlobUrl: string | null;
    resultSize: number;
    decodedMessage: string;
    hasSignature: boolean;
    requiresPassword: boolean;
    encode: (image: HTMLImageElement, message: string, password?: string) => Promise<void>;
    decode: (image: HTMLImageElement, password?: string) => Promise<void>;
    scan: (image: HTMLImageElement) => Promise<void>;
    clearResult: () => void;
    resetAll: () => void;
    progress: number;
}

export const useSteganography = (notify: (type: 'success' | 'error', msg: string) => void): UseSteganographyReturn => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
    const [resultSize, setResultSize] = useState(0);
    const [decodedMessage, setDecodedMessage] = useState('');
    const [hasSignature, setHasSignature] = useState(false);
    const [requiresPassword, setRequiresPassword] = useState(false);
    const [progress, setProgress] = useState(0);

    // Listen for progress updates from service
    useEffect(() => {
        const unsubscribe = steganographyService.subscribeProgress((p) => setProgress(p));

        return () => {
            unsubscribe();
            // Note: terminating here might be aggressive if multiple components use it,
            // but for this app it ensures cleanup on unmount.
            steganographyService.terminate();
        };
    }, []);

    const encode = async (image: HTMLImageElement, message: string, password?: string) => {
        setIsProcessing(true);
        setProgress(0);
        try {
            const imageData = getImageData(image);

            const newPixelBuffer = await steganographyService.encode(imageData.data.buffer, message, password);

            const newImgData = new ImageData(new Uint8ClampedArray(newPixelBuffer), image.width, image.height);
            const blob = await imageDataToBlob(newImgData, image.width, image.height);

            if (blob) {
                const url = URL.createObjectURL(blob);
                setResultBlobUrl(url);
                setResultSize(blob.size);
                notify('success', 'Encryption complete!');
            } else {
                throw new Error('Failed to generate image blob');
            }
        } catch (err: any) {
            notify('error', err.message || 'Encoding failed');
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    };

    const decode = async (image: HTMLImageElement, password?: string) => {
        setIsProcessing(true);
        setProgress(0);
        try {
            const imageData = getImageData(image);
            const text = await steganographyService.decode(imageData.data.buffer, password);
            setDecodedMessage(text);
            notify('success', 'Message decrypted!');
        } catch (err: any) {
            setDecodedMessage('');
            notify('error', err.message === 'Decryption failed' ? 'Wrong Password' : (err.message || 'Decoding failed'));
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    };

    const scan = async (image: HTMLImageElement) => {
        try {
            const imageData = getImageData(image);
            const bufferCopy = imageData.data.buffer.slice(0);
            const sigType = await steganographyService.scanImage(bufferCopy);

            if (sigType) {
                setHasSignature(true);
                setRequiresPassword(sigType === 'locked');
                notify('success', sigType === 'locked' ? 'Locked message detected!' : 'Open message detected!');
            } else {
                setHasSignature(false);
                setRequiresPassword(false);
            }
        } catch (error) {
            console.error("Scan error", error);
            notify('error', 'Failed to scan image for signatures.');
        }
    };

    const clearResult = () => {
        if (resultBlobUrl) {
            URL.revokeObjectURL(resultBlobUrl);
            setResultBlobUrl(null);
            setResultSize(0);
        }
    };

    const resetAll = () => {
        clearResult();
        setDecodedMessage('');
        setHasSignature(false);
        setRequiresPassword(false);
        setProgress(0);
    };

    return {
        isProcessing,
        resultBlobUrl,
        resultSize,
        decodedMessage,
        hasSignature,
        requiresPassword,
        encode,
        decode,
        scan,
        clearResult,
        resetAll,
        progress
    };
};

const getImageData = (img: HTMLImageElement): ImageData => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas context unavailable");
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height);
};

const imageDataToBlob = (imageData: ImageData, width: number, height: number): Promise<Blob | null> => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.putImageData(imageData, 0, 0);
            canvas.toBlob(resolve, 'image/png');
        } else {
            resolve(null);
        }
    });
};
