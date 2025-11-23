import React from 'react';
import { AppImage, AppMode } from '../types';
import { Upload, X, Image as ImageIcon, Scan, Lock, Unlock } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';

interface ImagePreviewProps {
    image: AppImage | null;
    hasSignature: boolean;
    requiresPassword: boolean;
    isLoading: boolean;
    onReset: () => void;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFileDrop: (file: File) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
    image,
    hasSignature,
    requiresPassword,
    isLoading,
    onReset,
    onFileSelect,
    onFileDrop
}) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = React.useState(false);

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFileDrop(file);
    };

    const statusBadge = React.useMemo(() => {
        if (!image) return null;
        if (hasSignature) {
            return requiresPassword ? (
                <div className="flex items-center gap-2 bg-amber-500/20 text-amber-200 px-3 py-1.5 rounded-full text-xs font-medium border border-amber-500/30 backdrop-blur-md shadow-lg">
                    <Lock size={12} /> Encrypted Message
                </div>
            ) : (
                <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-200 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-500/30 backdrop-blur-md shadow-lg">
                    <Unlock size={12} /> Message Found
                </div>
            );
        }
        return (
            <div className="flex items-center gap-2 bg-primary/20 text-primary-foreground px-3 py-1.5 rounded-full text-xs font-medium border border-primary/30 backdrop-blur-md shadow-lg">
                <ImageIcon size={12} /> Ready to Hide
            </div>
        );
    }, [image, hasSignature, requiresPassword]);

    return (
        <div className="w-full relative group">
            <AnimatePresence mode="wait">
                {image ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative w-full aspect-[16/9] md:aspect-[2/1] rounded-3xl overflow-hidden shadow-2xl bg-surface-raised group-hover:shadow-primary/5 transition-all duration-500"
                    >
                        {/* Image Background with Blur Filter */}
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-40 blur-3xl scale-110"
                            style={{ backgroundImage: `url(${image.objectUrl})` }}
                        />

                        {/* Main Image Container */}
                        <div className="absolute inset-4 md:inset-6 flex items-center justify-center">
                            <img
                                src={image.objectUrl}
                                alt="Preview"
                                className="max-w-full max-h-full object-contain rounded-xl shadow-lg relative z-10"
                            />

                            {/* Overlay Controls */}
                            <div className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none">
                                <div className="flex justify-between items-start p-2">
                                    <div className="pointer-events-auto">
                                        {statusBadge}
                                    </div>
                                    <Button
                                        variant="glass"
                                        size="sm"
                                        onClick={onReset}
                                        className="pointer-events-auto h-8 w-8 p-0 rounded-full bg-black/40 hover:bg-red-500/20 hover:text-red-400 border-white/10"
                                        title="Remove Image"
                                    >
                                        <X size={16} />
                                    </Button>
                                </div>
                            </div>
                        </div>

                         {/* Loading Overlay */}
                        {isLoading && (
                            <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center flex-col gap-4">
                                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                <p className="text-white font-medium animate-pulse">Scanning...</p>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn(
                            "w-full aspect-[16/9] md:aspect-[2.5/1] rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-4 cursor-pointer relative overflow-hidden",
                            isDragOver
                                ? "border-primary bg-primary/5 scale-[1.01]"
                                : "border-white/10 bg-surface/30 hover:bg-surface/50 hover:border-white/20"
                        )}
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                         {/* Animated Gradient Background for Idle State */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                        <div className="relative z-10 flex flex-col items-center gap-4 text-center p-6">
                            <div className={cn(
                                "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300",
                                isDragOver ? "bg-primary text-primary-foreground scale-110 rotate-3" : "bg-surface-raised text-white/50 group-hover:text-primary group-hover:scale-110"
                            )}>
                                {isLoading ? <Scan className="animate-pulse" size={32}/> : <Upload size={32} />}
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-white font-brand">
                                    {isLoading ? "Reading Image..." : "Upload Image"}
                                </h3>
                                <p className="text-sm text-white/50 max-w-[280px]">
                                    {isLoading ? "Please wait..." : "Drag & drop or click to browse"}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp"
                onChange={onFileSelect}
            />
        </div>
    );
};
