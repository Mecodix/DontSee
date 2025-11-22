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

    const notify = (type: 'success' | 'error', msg: string) => {
        setNotification({ type, msg });
        setTimeout(() => setNotification(null), 4000);
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

    const handleImageScan = (img: HTMLImageElement, mode: AppMode) => {
        try {
            const capacity = calculateMaxBytes(img.width, img.height);
            setMaxBytes(capacity);
        } catch (e) {
            console.error("Capacity calc error", e);
            setMaxBytes(0);
        }

        setTimeout(async () => {
            try {
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
                        notify('success', sigType === 'locked' ? 'Locked message detected!' : 'Open message detected!');
                    } else {
                        if (mode === AppMode.SEE) {
                            notify('error', 'No hidden message found in this image.');
                        }
                    }
                }
            } catch (error) {
                console.error("Scan error", error);
                notify('error', 'Failed to scan image for signatures.');
            }
        }, 100);
    };

    const processEncode = (image: AppImage) => {
        if (!message) return notify('error', 'Please provide a message.');
        const currentBytes = getByteLength(message);
        if (currentBytes > maxBytes) return notify('error', `Message is too long! Limit is ${maxBytes} bytes`);

        setIsProcessing(true);
        setProgress(0);
        setStage('analyzing'); // Step 1: Reading Image Data

        setTimeout(async () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) throw new Error("Canvas context unavailable");

                ctx.drawImage(image.imgObject, 0, 0);
                const imgData = ctx.getImageData(0, 0, image.width, image.height);

                setStage('processing'); // Step 2: Worker Processing

                const newPixelBuffer = await steganographyService.encode(
                    imgData.data.buffer,
                    message,
                    password,
                    (p) => setProgress(p)
                );

                setStage('rendering'); // Step 3: Creating Blob

                const newImgData = new ImageData(new Uint8ClampedArray(newPixelBuffer), image.width, image.height);
                ctx.putImageData(newImgData, 0, 0);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        setResultBlobUrl(url);
                        setResultSize(blob.size);
                        notify('success', 'Encryption complete!');
                    } else {
                        notify('error', 'Failed to generate image');
                    }
                    setIsProcessing(false);
                    setProgress(0);
                    setStage('idle');
                }, 'image/png');

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
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) throw new Error("Canvas context unavailable");

                ctx.drawImage(image.imgObject, 0, 0);
                const imgData = ctx.getImageData(0, 0, image.width, image.height);

                setStage('processing');

                const text = await steganographyService.decode(
                    imgData.data.buffer,
                    password,
                    (p) => setProgress(p)
                );
                setDecodedMessage(text);
                notify('success', 'Message decrypted!');
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
        stage, // New state
        notification,
        resultBlobUrl,
        resultSize,
        hasSignature,
        requiresPassword,
        maxBytes,
        processEncode,
        processDecode,
        handleImageScan,
        resetStegoState,
        notify
    };
};
