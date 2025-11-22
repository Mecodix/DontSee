import { useState, useEffect } from 'react';
import { steganographyService } from '../services/steganographyService';
import { calculateMaxBytes, getByteLength } from '../utils/capacity';
import { NotificationState, AppImage, AppMode } from '../types';

export type ProcessingStage = 'idle' | 'analyzing' | 'processing' | 'rendering';

export const useSteganography = () => {
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [decodedMessage, setDecodedMessage] = useState('');

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState<ProcessingStage>('idle');

    const [notification, setNotification] = useState<NotificationState | null>(null);
    const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
    const [resultSize, setResultSize] = useState(0);
    const [hasSignature, setHasSignature] = useState(false);
    const [requiresPassword, setRequiresPassword] = useState(false);
    const [maxBytes, setMaxBytes] = useState(0);

    // Expose scanning state to help App avoid flickering
    const [isScanning, setIsScanning] = useState(false);

    const notify = (type: 'success' | 'error', msg: string) => {
        setNotification({ type, msg });
        setTimeout(() => setNotification(null), 2000); // Reduced to 2s
    };

    // Cleanup Result URL
    useEffect(() => {
        return () => {
            if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
        };
    }, [resultBlobUrl]);

    // Cleanup Worker on unmount
    useEffect(() => {
        return () => {
            steganographyService.terminate();
        };
    }, []);

    // Clear result when inputs change
    useEffect(() => {
        if (resultBlobUrl) {
            setResultBlobUrl(null);
        }
    }, [message, password]);

    const resetStegoState = () => {
        setResultBlobUrl(null);
        setDecodedMessage('');
        setHasSignature(false);
        setRequiresPassword(false);
        setMessage('');
        setPassword('');
        setMaxBytes(0);
        setProgress(0);
        setStage('idle');
    };

    const handleImageScan = async (img: HTMLImageElement, mode: AppMode) => {
        setIsScanning(true);
        try {
            const capacity = calculateMaxBytes(img.width, img.height);
            setMaxBytes(capacity);
        } catch (e) {
            console.error("Capacity calc error", e);
            setMaxBytes(0);
        }

        // Artificial minimum delay to ensure user sees the "Analyzing..." state
        // This addresses user feedback about the state flickering too fast.
        const minDelay = new Promise(resolve => setTimeout(resolve, 400));

        try {
            const scanPromise = (async () => {
                 // Scan only the first row of pixels (sufficient for signature)
                const scanWidth = Math.min(img.width, 50);
                const scanHeight = 1;

                const canvas = document.createElement('canvas');
                canvas.width = scanWidth;
                canvas.height = scanHeight;

                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                    ctx.drawImage(img, 0, 0, scanWidth, scanHeight, 0, 0, scanWidth, scanHeight);
                    const imageData = ctx.getImageData(0, 0, scanWidth, scanHeight);
                    const bufferCopy = imageData.data.buffer.slice(0);
                    return await steganographyService.scanImage(bufferCopy);
                }
                return null;
            })();

            const [sigType] = await Promise.all([scanPromise, minDelay]);

            if (sigType) {
                setHasSignature(true);
                setRequiresPassword(sigType === 'locked');
            }
        } catch (error) {
            console.error("Scan error", error);
            notify('error', 'Failed to scan image for signatures.');
        } finally {
            setIsScanning(false);
        }
    };

    const processEncode = async (image: AppImage) => {
        if (!message) return notify('error', 'Please provide a message.');
        const currentBytes = getByteLength(message);
        if (currentBytes > maxBytes) return notify('error', `Message is too long! Limit is ${maxBytes} bytes`);

        setIsProcessing(true);
        setProgress(0);
        setStage('analyzing');

        // Yield to UI thread
        await new Promise(r => setTimeout(r, 0));

        try {
            const bitmap = await createImageBitmap(image.imgObject);
            setStage('processing');

            const resultBlob = await steganographyService.encode(
                bitmap,
                message,
                password,
                (p) => setProgress(old => Math.max(old, p))
            );

            setStage('rendering');

            const url = URL.createObjectURL(resultBlob);
            setResultBlobUrl(url);
            setResultSize(resultBlob.size);

            setIsProcessing(false);
            setProgress(0);
            setStage('idle');

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Encoding failed';
            notify('error', errorMessage);
            setIsProcessing(false);
            setProgress(0);
            setStage('idle');
        }
    };

    const processDecode = async (image: AppImage) => {
        setIsProcessing(true);
        setProgress(0);
        setStage('analyzing');

        // Yield to UI thread
        await new Promise(r => setTimeout(r, 0));

        try {
            const bitmap = await createImageBitmap(image.imgObject);

            setStage('processing');

            const text = await steganographyService.decode(
                bitmap,
                password,
                (p) => setProgress(old => Math.max(old, p))
            );

            setDecodedMessage(text);
        } catch (err) {
            setDecodedMessage('');
            const errorMessage = err instanceof Error ? err.message : 'Decoding failed';
            notify('error', errorMessage === 'Decryption failed' ? 'Wrong Password' : errorMessage);
        } finally {
            setIsProcessing(false);
            setProgress(0);
            setStage('idle');
        }
    };

    return {
        password, setPassword,
        message, setMessage,
        decodedMessage, setDecodedMessage,
        isProcessing,
        progress,
        stage,
        notification,
        resultBlobUrl,
        resultSize,
        hasSignature,
        requiresPassword,
        maxBytes,
        setMaxBytes, // Exposed
        processEncode,
        processDecode,
        handleImageScan,
        resetStegoState,
        notify
    };
};
