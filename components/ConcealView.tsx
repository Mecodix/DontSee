import React from 'react';
import { IconLock, IconDownload, IconEyeOff } from './Icons';
import { AppImage, ProcessingStage } from '../types';
import { cn } from '../utils/cn';

interface ConcealViewProps {
    image: AppImage | null;
    message: string;
    setMessage: (msg: string) => void;
    password: string;
    setPassword: (pwd: string) => void;
    maxBytes: number;
    currentBytes: number;
    isProcessing: boolean;
    stage: ProcessingStage;
    progress: number;
    resultBlobUrl: string | null;
    resultSize: number;
    onEncode: (img: AppImage) => void;
    getButtonLabel: () => React.ReactNode;
    formatBytes: (bytes: number) => string;
}

export const ConcealView: React.FC<ConcealViewProps> = ({
    image,
    message,
    setMessage,
    password,
    setPassword,
    maxBytes,
    currentBytes,
    isProcessing,
    stage,
    progress,
    resultBlobUrl,
    resultSize,
    onEncode,
    getButtonLabel,
    formatBytes
}) => {
    const usagePercent = maxBytes > 0 ? Math.min((currentBytes / maxBytes) * 100, 100) : 0;
    const isOverLimit = currentBytes > maxBytes;

    const getDownloadName = () => {
        if (!image) return 'dontsee_secure.png';
        const name = image.name;
        const lastDotIndex = name.lastIndexOf('.');
        if (lastDotIndex === -1) return `${name}_secure.png`;
        return `${name.substring(0, lastDotIndex)}_secure.png`;
    };

    const downloadName = getDownloadName();

    return (
        <div className="flex flex-col gap-5 animate-fade-in">
            {/* Message Input */}
            <div className="flex flex-col gap-2 group">
                <div className="relative">
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Write your secret message..."
                        className={cn(
                            "w-full bg-surface-raised/50 backdrop-blur-sm border text-white rounded-2xl p-5 resize-none transition-all placeholder-white/20 min-h-[140px] outline-none shadow-inner",
                            isOverLimit
                                ? "border-error/50 focus:border-error focus:ring-4 focus:ring-error/10"
                                : "border-white/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 hover:border-white/20"
                        )}
                    ></textarea>
                </div>

                {/* Capacity Bar */}
                <div className="flex items-center gap-3 px-1">
                    <div className="flex-1 h-1.5 bg-surface-raised rounded-full overflow-hidden">
                        <div
                            className={cn("h-full transition-all duration-500 ease-out", isOverLimit ? 'bg-error shadow-[0_0_10px_rgba(242,184,181,0.5)]' : 'bg-primary shadow-[0_0_10px_rgba(208,188,255,0.3)]')}
                            style={{ width: `${usagePercent}%` }}
                        ></div>
                    </div>
                    <span className={cn("text-xs font-mono font-medium", isOverLimit ? 'text-error' : 'text-white/40')}>
                        {currentBytes} / {maxBytes} bytes
                    </span>
                </div>
                {maxBytes === 0 && (
                    <p className="text-xs text-error font-bold px-1 animate-slide-up">
                        Image too small to hide data.
                    </p>
                )}
            </div>

            {/* Password Input */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-primary text-white/30">
                    <IconLock className="w-5 h-5" />
                </div>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Encrypt with Password (Optional)"
                    className="w-full bg-surface-raised/50 backdrop-blur-sm border border-white/10 text-white text-sm rounded-2xl py-5 pl-12 pr-5 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder-white/20 hover:border-white/20"
                />
            </div>

            {/* Action Area */}
            {resultBlobUrl ? (
                <div className="animate-scale-in bg-surface-raised border border-white/10 p-4 rounded-2xl flex items-center justify-between shadow-xl">
                    <div className="flex flex-col justify-center max-w-[70%]">
                        <p className="text-white font-bold text-sm mb-1 truncate" title={downloadName}>
                            {downloadName}
                        </p>
                        <p className="text-primary text-xs font-mono">{formatBytes(resultSize)}</p>
                    </div>
                    <a
                        href={resultBlobUrl}
                        download={downloadName}
                        className="w-12 h-12 bg-primary hover:bg-white text-on-primary rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                        aria-label="Download encoded image"
                    >
                        <IconDownload className="w-6 h-6" />
                    </a>
                </div>
            ) : (
                <button
                    onClick={() => image && onEncode(image)}
                    disabled={isProcessing || !message || isOverLimit}
                    aria-label="Encrypt and conceal message"
                    className={cn(
                        "py-5 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-3 relative overflow-hidden",
                        (!message || isOverLimit)
                            ? "bg-surface-raised border border-white/5 text-white/20 cursor-not-allowed"
                            : "bg-gradient-to-r from-primary to-[#bfa6f5] hover:to-white text-on-primary shadow-primary/20 hover:shadow-primary/40"
                    )}>

                    {isProcessing ? (
                        <div className="flex items-center gap-3 z-10 relative">
                            <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
                            <span className="animate-pulse">{getButtonLabel()}</span>
                        </div>
                    ) : (
                        <><IconEyeOff className="w-5 h-5"/> Conceal Message</>
                    )}

                    {isProcessing && stage === 'processing' && (
                        <div className="absolute inset-0 bg-white/30 z-0 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }}></div>
                    )}
                </button>
            )}
        </div>
    );
};
