import { useState, useEffect, useRef } from 'react';
import { steganographyService } from '../services/steganographyService';
import { calculateMaxBytes, getByteLength } from '../utils/capacity';
import { NotificationState, AppImage, AppMode } from '../types';

export type ProcessingStage = 'idle' | 'analyzing' | 'processing' | 'rendering';

export const useSteganography = () => {
    // Track the current scan operation to prevent race conditions
    const currentScanId = useRef(0);
    // Track current active operation (Encode/Decode) to prevent race conditions
    const currentOperationId = useRef(0);

    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [decodedMessage, setDecodedMessage] = useState('');

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState<ProcessingStage>('idle');

    const [notification, setNotification] = useState<NotificationState | null>(null);
    const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
    const [resultSize, setResultSize] = useState(0);

    // In True Stego, we never know if there is a signature or if it requires a password
    // until we try to decode it.
    // We keep these states internally consistent (always false) to satisfy Typescript
    // and downstream logic until we fully refactor the UI.
    const [hasSignature, setHasSignature] = useState(false);
    const [requiresPassword, setRequiresPassword] = useState(false);

    const [maxBytes, setMaxBytes] = useState(0);

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
        // Invalidate any pending scans and operations
        currentScanId.current++;
        currentOperationId.current++;

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
        // In True Stego, "Scanning" is purely for capacity calculation.
        // There is NO detection of existing messages.

        try {
            const capacity = calculateMaxBytes(img.width, img.height);
            setMaxBytes(capacity);
        } catch (e) {
            console.error("Capacity calc error", e);
            setMaxBytes(0);
        }

        // We do NOT call steganographyService.scanImage anymore because
        // it is impossible to detect a message without the password.
        setHasSignature(false);
        setRequiresPassword(false);
    };

    const processEncode = async (image: AppImage) => {
        if (!message) return notify('error', 'Please provide a message.');
        // Password is now MANDATORY for True Stego to generate the scatter seed.
        if (!password) return notify('error', 'Password is required for secure encoding.');

        const currentBytes = getByteLength(message);
        if (currentBytes > maxBytes) return notify('error', `Message is too long! Limit is ${maxBytes} bytes`);

        const opId = ++currentOperationId.current;
        setIsProcessing(true);
        setProgress(0);
        setStage('analyzing');

        // Yield to UI thread
        await new Promise(r => setTimeout(r, 0));

        try {
            if (opId !== currentOperationId.current) return;
            const bitmap = await createImageBitmap(image.imgObject);

            if (opId !== currentOperationId.current) return;
            setStage('processing');

            const resultBlob = await steganographyService.encode(
                bitmap,
                message,
                password,
                (p) => {
                    if (opId === currentOperationId.current) {
                        setProgress(old => Math.max(old, p));
                    }
                }
            );

            if (opId !== currentOperationId.current) return;
            setStage('rendering');

            const url = URL.createObjectURL(resultBlob);
            setResultBlobUrl(url);
            setResultSize(resultBlob.size);

            setIsProcessing(false);
            setProgress(0);
            setStage('idle');

        } catch (err) {
            if (opId !== currentOperationId.current) return;
            const errorMessage = err instanceof Error ? err.message : 'Encoding failed';
            notify('error', errorMessage);
            setIsProcessing(false);
            setProgress(0);
            setStage('idle');
        }
    };

    const processDecode = async (image: AppImage) => {
        if (!password) return notify('error', 'Password is required to decrypt.');

        const opId = ++currentOperationId.current;
        setIsProcessing(true);
        setProgress(0);
        setStage('analyzing');

        // Yield to UI thread
        await new Promise(r => setTimeout(r, 0));

        try {
            if (opId !== currentOperationId.current) return;
            const bitmap = await createImageBitmap(image.imgObject);

            if (opId !== currentOperationId.current) return;
            setStage('processing');

            const text = await steganographyService.decode(
                bitmap,
                password,
                (p) => {
                    if (opId === currentOperationId.current) {
                        setProgress(old => Math.max(old, p));
                    }
                }
            );

            if (opId !== currentOperationId.current) return;
            setDecodedMessage(text);
        } catch (err) {
            if (opId !== currentOperationId.current) return;
            setDecodedMessage('');
            const errorMessage = err instanceof Error ? err.message : 'Decoding failed';
            // In True Stego, we don't know if it was "Wrong Password" or "No Message".
            // The worker returns a generic error or "No hidden message found with this password."
            notify('error', errorMessage);
        } finally {
            if (opId === currentOperationId.current) {
                setIsProcessing(false);
                setProgress(0);
                setStage('idle');
            }
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
