import { useState, useEffect } from 'react';
import { AppImage } from '../types';

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

    const processFile = (file: File, onLoadSuccess?: (img: HTMLImageElement) => void, onError?: () => void) => {
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
            if (onError) onError();
            URL.revokeObjectURL(objectUrl);
        };

        img.src = objectUrl;
    };

    const resetImage = () => {
        setImage(null);
    };

    return {
        image,
        processFile,
        resetImage
    };
};
