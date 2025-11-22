import { useState, useEffect } from 'react';
import { AppImage } from '../types';
import { validateImageFile } from '../utils/validation';

export const useImageHandler = () => {
    const [image, setImage] = useState<AppImage | null>(null);

    // Cleanup Image Preview URL (Blob)
    useEffect(() => {
        return () => {
            if (image?.src && image.src.startsWith('blob:')) {
                URL.revokeObjectURL(image.src);
            }
        };
    }, [image]);

    const processFile = async (file: File, onLoadSuccess?: (img: HTMLImageElement) => void, onError?: (msg?: string) => void) => {
        // 1. Magic Byte Validation
        const isValid = await validateImageFile(file);
        if (!isValid) {
            if (onError) onError("Invalid file format. Please upload a valid PNG or JPG.");
            return;
        }

        // 2. Load Image
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            setImage({
                imgObject: img,
                width: img.width,
                height: img.height,
                src: objectUrl,
                name: file.name
            });

            if (onLoadSuccess) onLoadSuccess(img);
        };

        img.onerror = () => {
            if (onError) onError("Failed to load image data.");
            URL.revokeObjectURL(objectUrl);
        };

        img.src = objectUrl;
    };

    // Global Paste Listener
    // Note: This relies on the component using this hook to be mounted.
    // We export a setup function or just attach it here if the user expects global paste.
    // Given the request is "Ctrl+V support", global paste is the standard expectation.
    const usePasteHandler = (
        onPasteFound: (file: File) => void,
        onError: (msg: string) => void
    ) => {
        useEffect(() => {
            const handlePaste = (e: ClipboardEvent) => {
                if (!e.clipboardData || !e.clipboardData.items) return;

                const items = e.clipboardData.items;
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        const blob = items[i].getAsFile();
                        if (blob) {
                            // Defaults to a generic name since paste doesn't have one
                            // We can recreate a File to give it a name if needed, or just use Blob.
                            // The validateImageFile expects a File/Blob, processFile handles it.
                            // Let's ensure it has a name for the UI.
                            const file = new File([blob], "pasted_image.png", { type: blob.type });
                            onPasteFound(file);
                            e.preventDefault(); // Prevent default paste behavior (e.g. into textareas if focused?)
                            // Actually, if user is pasting text into the message box, we shouldn't hijack it if it's text.
                            // But we only checked for 'image'. So this is safe.
                            return;
                        }
                    }
                }
            };

            window.addEventListener('paste', handlePaste);
            return () => {
                window.removeEventListener('paste', handlePaste);
            };
        }, [onPasteFound, onError]);
    };

    const resetImage = () => {
        setImage(null);
    };

    return {
        image,
        processFile,
        resetImage,
        usePasteHandler
    };
};
