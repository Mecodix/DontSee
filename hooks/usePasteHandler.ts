import { useEffect } from 'react';

export const usePasteHandler = (
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
                        const file = new File([blob], "pasted_image.png", { type: blob.type });
                        onPasteFound(file);
                        e.preventDefault();
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
