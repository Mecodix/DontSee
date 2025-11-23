import React, { useState, DragEvent, KeyboardEvent, useRef } from 'react';
import { IconUpload, IconX, IconLock, IconUnlock } from './Icons';
import { AppImage } from '../types';
import { cn } from '../utils/cn';

interface ImagePreviewProps {
    image: AppImage | null;
    hasSignature: boolean;
    requiresPassword?: boolean;
    isLoading?: boolean;
    onReset: () => void;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFileDrop: (file: File) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ image, hasSignature, requiresPassword, isLoading, onReset, onFileSelect, onFileDrop }) => {
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

        if (e.currentTarget.contains(e.relatedTarget as Node)) {
            return;
        }

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
            className={cn(
                "relative rounded-[24px] overflow-hidden transition-all duration-300 w-full group select-none",
                image
                    ? 'bg-transparent'
                    : cn(
                        "min-h-[300px] border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-white/[0.02]",
                        isDragging && "border-primary bg-primary/5 scale-[1.02] shadow-[0_0_40px_rgba(168,85,247,0.2)]"
                    )
            )}>
            
            {isLoading && !image && (
                 <div className="absolute inset-0 z-20 bg-surface/95 backdrop-blur-xl flex flex-col items-center justify-center">
                     <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                     <span className="text-white font-bold animate-pulse">Processing Image...</span>
                 </div>
            )}

            {image ? (
                <div className="w-full relative flex justify-center rounded-[24px] overflow-hidden shadow-2xl border border-white/5 bg-surface-raised/30 backdrop-blur-sm">
                    {/* Image Container */}
                    <img src={image.src} className="w-full h-auto max-h-[500px] object-contain animate-enter" alt="Preview" />
                    
                    {/* Action Overlay */}
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                         <button onClick={onReset}
                            disabled={isLoading}
                            aria-label="Remove image"
                            // Changed hover:bg-red-500/80 to hover:bg-primary (pinkish purple)
                            className="w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-primary rounded-full text-white backdrop-blur-md border border-white/10 transition-all hover:scale-110 shadow-lg">
                            <IconX className="w-5 h-5" />
                        </button>
                    </div>

                    
                    {hasSignature && (
                        <div
                            role="status"
                            aria-live="polite"
                            className={cn(
                                "absolute bottom-4 left-4 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 animate-slide-up shadow-xl z-10 border backdrop-blur-md",
                                requiresPassword
                                    // Updated colors to match UI: Pink/Purple for locked
                                    ? 'bg-pink-600/90 text-white border-white/20 shadow-pink-600/20'
                                    // Updated colors to match UI: Deep Violet for open (instead of emerald)
                                    : 'bg-violet-600/90 text-white border-white/20 shadow-violet-600/20'
                            )}
                        >
                            {requiresPassword ? (
                                <><IconLock className="w-3.5 h-3.5" /> Locked Text</>
                            ) : (
                                <><IconUnlock className="w-3.5 h-3.5" /> Open Text</>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer focus:outline-none"
                    aria-label="Upload an image"
                >
                    <div className={cn(
                        "p-6 rounded-full mb-6 text-primary bg-primary/10 transition-transform duration-300 shadow-[0_0_30px_rgba(168,85,247,0.15)]",
                        isDragging ? 'scale-110 bg-primary/20' : 'group-hover:scale-110 group-hover:rotate-3'
                    )}>
                        <IconUpload className="w-10 h-10" />
                    </div>
                    <span className="text-white font-bold text-xl tracking-tight">
                        {isDragging ? 'Drop it like it\'s hot!' : 'Upload Image'}
                    </span>
                    <span className="text-gray-500 text-sm mt-2 font-medium">
                        Drag & Drop or Click to Browse
                    </span>
                    <span className="mt-4 px-3 py-1 bg-white/5 rounded-full text-xs text-gray-500 border border-white/5">
                        PNG, JPG, WebP
                    </span>
                    
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
