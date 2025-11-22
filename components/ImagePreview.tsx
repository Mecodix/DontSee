import React, { useState, DragEvent, KeyboardEvent, useRef } from 'react';
import { IconUpload, IconX, IconLock, IconUnlock } from './Icons';
import { AppImage } from '../types';

interface ImagePreviewProps {
    image: AppImage | null;
    hasSignature: boolean;
    requiresPassword?: boolean;
    onReset: () => void;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFileDrop: (file: File) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ image, hasSignature, requiresPassword, onReset, onFileSelect, onFileDrop }) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                onFileDrop(file);
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
        }
    };

    return (
        <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-3xl overflow-hidden border-2 transition-all duration-300 w-full
            ${image 
                ? 'border-secondary-container bg-surface' 
                : `min-h-[400px] cursor-pointer group ${isDragging
                    ? 'border-primary bg-primary/10'
                    : 'border-dashed border-secondary-container hover:border-primary hover:bg-secondary-container/20 focus-within:border-primary focus-within:bg-secondary-container/20'}`
            }`}>
            
            {image ? (
                <div className="w-full relative flex justify-center bg-black/50">
                    <img src={image.src} className="w-full h-auto max-h-[500px] min-h-[300px] object-contain" alt="Preview" />
                    
                    <button onClick={onReset} 
                        aria-label="Remove image"
                        className="absolute top-3 right-3 bg-surface-container/80 p-2 rounded-full text-white hover:text-error backdrop-blur-sm border border-secondary-container transition-transform hover:scale-110">
                        <IconX className="w-5 h-5" />
                    </button>
                    
                    {hasSignature && (
                        <div
                            role="status"
                            aria-live="polite"
                            className={`absolute bottom-3 left-3 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 animate-slide-up shadow-lg z-10 border backdrop-blur-md
                            ${requiresPassword
                                ? 'bg-primary/90 text-on-primary border-primary-container'
                                : 'bg-secondary-container/90 text-white border-white/20'}`}
                        >
                            {requiresPassword ? (
                                <><IconLock className="w-3.5 h-3.5" /> Locked Message</>
                            ) : (
                                <><IconUnlock className="w-3.5 h-3.5" /> Open Message</>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                // Accessibility Improvements: Focusable div + Keyboard handler
                <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer focus:outline-none rounded-3xl"
                    aria-label="Upload an image"
                >
                    <div className={`bg-secondary-container p-6 rounded-full mb-6 text-white transition-transform shadow-xl shadow-black/30 ${isDragging ? 'scale-125' : 'group-hover:scale-110'}`}>
                        <IconUpload className="w-10 h-10" />
                    </div>
                    <span className="text-white font-bold text-lg">{isDragging ? 'Drop it here!' : 'Tap or Drag to Upload'}</span>
                    <span className="text-outline text-sm mt-2">PNG or JPG</span>
                    
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={onFileSelect}
                        className="hidden"
                        aria-hidden="true"
                    />
                </div>
            )}
        </div>
    );
};
