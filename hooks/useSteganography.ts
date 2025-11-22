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
                // Scan still uses main thread canvas for small data reads (fast)
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, img.width, img.height);

                    // Optimization: Only send first few KB for scan?
                    // Current implementation sends whole buffer copy.
                    // For scan, we only check first few bytes.
                    // But scanImage contract expects full buffer.
                    // We can keep this as is or optimize later.
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
        // Note: Compression happens in worker, so this check is conservative/safe.
        if (currentBytes > maxBytes) return notify('error', `Message is too long! Limit is ${maxBytes} bytes`);

        setIsProcessing(true);
        setProgress(0);
        setStage('analyzing'); // Generating Bitmap

        setTimeout(async () => {
            try {
                // OffscreenCanvas Optimization: Create ImageBitmap to transfer
                // We create it from the imgObject which is already loaded
                const bitmap = await createImageBitmap(image.imgObject);

                setStage('processing'); // Worker Processing

                // Encode returns a Blob directly now!
                const resultBlob = await steganographyService.encode(
                    bitmap,
                    message,
                    password,
                    (p) => setProgress(old => Math.max(old, p))
                );

                setStage('rendering'); // Finalizing

                // Artificial delay removed/reduced because we already have the blob
                // But keeping small delay for UX smoothness if needed, or just done.
                // await new Promise(r => setTimeout(r, 100));

                const url = URL.createObjectURL(resultBlob);
                setResultBlobUrl(url);
                setResultSize(resultBlob.size);
                notify('success', 'Encryption complete!');

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
        stage,
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
