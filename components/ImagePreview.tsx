import React from 'react';
import { IconUpload, IconX, IconCheck } from './Icons';
import { AppImage } from '../types';

interface ImagePreviewProps {
    image: AppImage | null;
    hasSignature: boolean;
    onReset: () => void;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ image, hasSignature, onReset, onFileSelect }) => {
    return (
        <div className={`relative rounded-3xl overflow-hidden border-2 transition-all duration-500
            ${image ? 'border-transparent bg-black mb-6' : 'border-dashed border-secondary-container hover:border-primary hover:bg-secondary-container/20 h-full min-h-[400px] cursor-pointer group'}`}>
            
            {image ? (
                <div className="w-full relative flex justify-center bg-black/50 rounded-3xl">
                    <img src={image.src} className="w-full h-auto max-h-[500px] object-contain" alt="Preview" />
                    
                    <button onClick={onReset} 
                        className="absolute top-3 right-3 bg-surface-container/80 p-2 rounded-full text-white hover:text-error backdrop-blur-sm border border-secondary-container">
                        <IconX className="w-5 h-5" />
                    </button>
                    
                    {hasSignature && (
                        <div className="absolute bottom-3 left-3 bg-on-primary border border-primary text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 animate-slide-up shadow-lg">
                            <IconCheck className="w-3 h-3" /> Signature Detected
                        </div>
                    )}
                </div>
            ) : (
                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                    <div className="bg-secondary-container p-6 rounded-full mb-6 text-white group-hover:scale-110 transition-transform shadow-xl shadow-black/30">
                        <IconUpload className="w-10 h-10" />
                    </div>
                    <span className="text-white font-bold text-lg">Click to upload Image</span>
                    <span className="text-outline text-sm mt-2">PNG or JPG</span>
                    <input type="file" accept="image/*" onChange={onFileSelect} className="hidden" />
                </label>
            )}
        </div>
    );
};