
import { useState, useEffect } from 'react';
import { AppImage } from '../types';

interface UseImageHandlerReturn {
    image: AppImage | null;
    processFile: (file: File, callback?: (img: HTMLImageElement) => void) => void;
    resetImage: () => void;
}

export const useImageHandler = (notify: (type: 'success' | 'error', msg: string) => void): UseImageHandlerReturn => {
    const [image, setImage] = useState<AppImage | null>(null);

    // Cleanup Image Preview URL
    useEffect(() => {
        return () => {
            if (image?.src && image.src.startsWith('blob:')) {
                URL.revokeObjectURL(image.src);
            }
        };
    }, [image]);

    const processFile = (file: File, callback?: (img: HTMLImageElement) => void) => {
        if (!file.type.startsWith('image/')) {
            notify('error', 'Please select a valid image file (PNG, JPG).');
            return;
        }

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

            if (callback) callback(img);
        };

        img.onerror = () => {
            notify('error', 'Failed to load image');
            URL.revokeObjectURL(objectUrl);
        };

        img.src = objectUrl;
    };

    const resetImage = () => {
        setImage(null);
    };

    return { image, processFile, resetImage };
};
