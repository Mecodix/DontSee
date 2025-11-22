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

        // We use a Promise wrapper for the async scan part to ensure awaitability
        await new Promise<void>(resolve => {
            setTimeout(async () => {
                try {
                    // Scan still uses main thread canvas for small data reads (fast)
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        const imageData = ctx.getImageData(0, 0, img.width, img.height);

                        const bufferCopy = imageData.data.buffer.slice(0);
                        const sigType = await steganographyService.scanImage(bufferCopy);

                        if (sigType) {
                            setHasSignature(true);
                            setRequiresPassword(sigType === 'locked');
                            // User Request: Remove notifications for detection
                        }
                    }
                } catch (error) {
                    console.error("Scan error", error);
                    notify('error', 'Failed to scan image for signatures.');
                } finally {
                    resolve();
                }
            }, 50);
        });
        setIsScanning(false);
    };

    const processEncode = (image: AppImage) => {
        if (!message) return notify('error', 'Please provide a message.');
        const currentBytes = getByteLength(message);
        if (currentBytes > maxBytes) return notify('error', `Message is too long! Limit is ${maxBytes} bytes`);

        setIsProcessing(true);
        setProgress(0);
        setStage('analyzing');

        setTimeout(async () => {
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
                // User Request: Remove "Encryption complete!" notification

                setIsProcessing(false);
                setProgress(0);
                setStage('idle');

            } catch (err: any) {
                notify('error', err.message || 'Encoding failed');
                setIsProcessing(false);
                setProgress(0);
                setStage('idle');
            }
        }, 50);
    };

    const processDecode = (image: AppImage) => {
        setIsProcessing(true);
        setProgress(0);
        setStage('analyzing');

        setTimeout(async () => {
            try {
                const bitmap = await createImageBitmap(image.imgObject);

                setStage('processing');

                const text = await steganographyService.decode(
                    bitmap,
                    password,
                    (p) => setProgress(old => Math.max(old, p))
                );

                setDecodedMessage(text);
                // User Request: Remove "Message decrypted!" notification
            } catch (err: any) {
                setDecodedMessage('');
                notify('error', err.message === 'Decryption failed' ? 'Wrong Password' : (err.message || 'Decoding failed'));
            } finally {
                setIsProcessing(false);
                setProgress(0);
                setStage('idle');
            }
        }, 50);
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
