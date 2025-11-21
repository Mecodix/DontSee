import React, { useState, DragEvent } from 'react';
import { IconUpload, IconX, IconCheck } from './Icons';
import { AppImage } from '../types';

interface ImagePreviewProps {
    image: AppImage | null;
    hasSignature: boolean;
    onReset: () => void;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    // UX UPGRADE: New handler for dropping files
    onFileDrop: (file: File) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ image, hasSignature, onReset, onFileSelect, onFileDrop }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            // Simple check for image type
            if (file.type.startsWith('image/')) {
                onFileDrop(file);
            }
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
                : `min-h-[400px] cursor-pointer group ${isDragging ? 'border-primary bg-primary/10' : 'border-dashed border-secondary-container hover:border-primary hover:bg-secondary-container/20'}`
            }`}>
            
            {image ? (
                <div className="w-full relative flex justify-center bg-black/50">
                    <img src={image.src} className="w-full h-auto max-h-[500px] min-h-[300px] object-contain" alt="Preview" />
                    
                    <button onClick={onReset} 
                        className="absolute top-3 right-3 bg-surface-container/80 p-2 rounded-full text-white hover:text-error backdrop-blur-sm border border-secondary-container transition-transform hover:scale-110">
                        <IconX className="w-5 h-5" />
                    </button>
                    
                    {hasSignature && (
                        <div className="absolute bottom-3 left-3 bg-on-primary border border-primary text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 animate-slide-up shadow-lg z-10">
                            <IconCheck className="w-3 h-3" /> Signature Detected
                        </div>
                    )}
                </div>
            ) : (
                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer pointer-events-none">
                    <div className={`bg-secondary-container p-6 rounded-full mb-6 text-white transition-transform shadow-xl shadow-black/30 ${isDragging ? 'scale-125' : 'group-hover:scale-110'}`}>
                        <IconUpload className="w-10 h-10" />
                    </div>
                    <span className="text-white font-bold text-lg">{isDragging ? 'Drop it here!' : 'Click or Drag to Upload'}</span>
                    <span className="text-outline text-sm mt-2">PNG or JPG</span>
                    {/* Enable pointer events for input specifically */}
                    <input type="file" accept="image/*" onChange={onFileSelect} className="hidden pointer-events-auto" />
                </label>
            )}
        </div>
    );
};