import React, { useState, DragEvent, KeyboardEvent, useRef } from 'react';
import { IconX, IconLock, IconUnlock } from './Icons';
import { ImageToDataIcon } from './ImageToDataIcon';
import { AppImage } from '../types';
import { cn } from '../utils/cn';
import { Typography } from './ui/Typography';
import { Button } from './ui/Button';

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

    // The "Bento Hero" Block
    return (
        <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
                "relative rounded-3xl overflow-hidden transition-all duration-300 w-full group select-none",
                // If no image, it's a big clickable dropzone
                image
                    ? 'bg-transparent'
                    : cn(
                        "min-h-[360px] border-2 border-dashed border-white/10 hover:border-primary/50",
                        // Glass & Texture
                        "bg-white/[0.02] backdrop-blur-md",
                        isDragging && "border-primary bg-primary/10 scale-[1.01] shadow-[0_0_50px_rgba(139,92,246,0.3)] ring-4 ring-primary/20 ring-offset-4 ring-offset-background"
                    )
            )}>
            
            {/* Loading Overlay */}
            {isLoading && !image && (
                 <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in">
                     <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin-slow mb-6"></div>
                     <Typography variant="h3" className="animate-pulse">Processing Image...</Typography>
                 </div>
            )}

            {image ? (
                <div className="w-full relative flex justify-center rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-surface/50 backdrop-blur-xl">
                    {/* Image Container */}
                    <img src={image.src} className="w-full h-auto max-h-[500px] object-contain animate-enter" alt="Preview" />
                    
                    {/* Floating Action Button (Delete) */}
                    <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                         <button onClick={onReset}
                            disabled={isLoading}
                            aria-label="Remove image"
                            className="w-12 h-12 flex items-center justify-center bg-black/60 hover:bg-error rounded-full text-white backdrop-blur-xl border border-white/10 transition-all hover:scale-110 shadow-lg active:scale-95">
                            <IconX className="w-6 h-6" />
                        </button>
                    </div>

                    
                    {/* Bento Badge */}
                    {hasSignature && (
                        <div
                            role="status"
                            aria-live="polite"
                            className={cn(
                                "absolute bottom-6 left-6 pl-3 pr-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 animate-slide-up shadow-xl z-10 border backdrop-blur-2xl ring-1 ring-white/10",
                                requiresPassword
                                    ? 'bg-pink-600/20 text-pink-200 border-pink-500/30'
                                    : 'bg-primary/20 text-primary-foreground border-primary/30'
                            )}
                        >
                            <div className={cn(
                                "w-2 h-2 rounded-full animate-pulse",
                                requiresPassword ? "bg-pink-500" : "bg-primary"
                            )}></div>
                            {requiresPassword ? (
                                <><IconLock className="w-4 h-4" /> Locked</>
                            ) : (
                                <><IconUnlock className="w-4 h-4" /> Open</>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                // Empty State Dropzone
                <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer focus:outline-none"
                    aria-label="Upload an image"
                >
                    <div className={cn(
                        "mb-8 p-6 rounded-full bg-white/5 border border-white/10 transition-all duration-500 group-hover:scale-110 group-hover:bg-white/10 group-hover:border-primary/30 group-hover:shadow-[0_0_30px_-10px_rgba(139,92,246,0.5)]",
                        isDragging && "scale-125 bg-primary/20 border-primary shadow-[0_0_50px_-10px_rgba(139,92,246,0.8)]"
                    )}>
                        <ImageToDataIcon className="w-12 h-12 text-white/80 group-hover:text-white" />
                    </div>

                    <Typography variant="h3" className="mb-2 group-hover:text-primary transition-colors">
                        {isDragging ? 'Drop it like it\'s hot!' : 'Upload Image'}
                    </Typography>

                    <Typography variant="body" className="text-white/40 mb-6">
                        Drag & Drop or Click to Browse
                    </Typography>

                    <div className="flex gap-2">
                         {['PNG', 'JPG', 'WebP'].map(ext => (
                             <span key={ext} className="px-3 py-1 rounded-md bg-white/5 border border-white/5 text-[10px] font-mono text-white/30 tracking-wider">
                                 {ext}
                             </span>
                         ))}
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
