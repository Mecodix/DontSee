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
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
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
                "relative w-full rounded-2xl overflow-hidden transition-all duration-500 ease-out border group",
                image
                    ? "border-white/10 bg-black/40 shadow-inner"
                    : cn(
                        "min-h-[260px] cursor-pointer flex flex-col items-center justify-center",
                        "border-dashed",
                        isDragging
                            ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(208,188,255,0.2)] scale-[1.02]"
                            : "border-white/10 hover:border-primary/50 hover:bg-white/5"
                    )
            )}>
            
            {/* Loading Overlay - Glassmorphism */}
            {isLoading && !image && (
                 <div className="absolute inset-0 z-30 bg-surface/60 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
                     <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse-slow"></div>
                        <div className="relative w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                     </div>
                     <span className="text-white font-medium mt-4 animate-pulse tracking-wide">Processing...</span>
                 </div>
            )}

            {image ? (
                <div className="relative w-full h-full flex items-center justify-center bg-[url('/checker-pattern.png')]">
                    {/* Checker pattern simulated with CSS if image has transparency */}
                    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,#808080_25%,transparent_25%,transparent_75%,#808080_75%,#808080),linear-gradient(45deg,#808080_25%,transparent_25%,transparent_75%,#808080_75%,#808080)] bg-[length:20px_20px] bg-[position:0_0,10px_10px]"></div>

                    <img src={image.src} className="relative z-10 w-full h-auto max-h-[400px] object-contain shadow-2xl" alt="Preview" />
                    
                    {/* Reset Button */}
                    <button onClick={onReset} 
                        disabled={isLoading}
                        aria-label="Remove image"
                        className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-error/80 text-white p-2.5 rounded-full backdrop-blur-md border border-white/10 transition-all hover:scale-110 shadow-lg group-hover:opacity-100 md:opacity-0 opacity-100">
                        <IconX className="w-5 h-5" />
                    </button>
                    
                    {/* Status Badge */}
                    {hasSignature && (
                        <div
                            role="status"
                            aria-live="polite"
                            className={cn(
                                "absolute bottom-4 left-4 z-20 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-slide-up shadow-xl border backdrop-blur-md",
                                requiresPassword
                                    ? "bg-surface-raised/90 text-primary border-primary/30 shadow-primary/10"
                                    : "bg-surface-raised/90 text-white border-white/20"
                            )}
                        >
                            {requiresPassword ? (
                                <><IconLock className="w-4 h-4 text-primary" /> Locked Message</>
                            ) : (
                                <><IconUnlock className="w-4 h-4 text-secondary" /> Open Message</>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                // Empty State
                <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center outline-none"
                    aria-label="Upload an image"
                >
                    <div className={cn(
                        "p-6 rounded-3xl mb-4 transition-all duration-500",
                        isDragging ? "bg-primary text-on-primary scale-110 rotate-3" : "bg-surface-raised border border-white/5 text-outline group-hover:text-primary group-hover:scale-110 group-hover:bg-surface-raised/80 group-hover:border-primary/20"
                    )}>
                        <IconUpload className="w-10 h-10" />
                    </div>

                    <div className="space-y-1">
                        <span className="block text-white font-bold text-lg tracking-tight group-hover:text-primary transition-colors">
                            {isDragging ? 'Drop Image Here' : 'Upload Image'}
                        </span>
                        <span className="block text-white/40 text-sm font-medium">
                            Supports JPG, PNG, WebP
                        </span>
                    </div>
                    
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
