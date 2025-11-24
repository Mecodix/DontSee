import React from 'react';
import { IconLock, IconDownload, IconEyeOff } from './Icons';
import { AppImage, ProcessingStage } from '../types';
import { ExpandableTextarea } from './ExpandableTextarea';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Typography } from './ui/Typography';
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

    const footerContent = (
        <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                    className={cn(
                        "h-full transition-all duration-300 shadow-[0_0_10px_currentColor]",
                        // Reverted to standard red error state
                        isOverLimit ? 'bg-red-500 text-red-500' : 'bg-primary text-primary'
                    )}
                    style={{ width: `${usagePercent}%` }}
                ></div>
            </div>
            <Typography variant="caption" className={isOverLimit ? 'text-red-400 font-bold' : 'text-gray-500'}>
                {currentBytes} / {maxBytes} bytes
            </Typography>
        </div>
    );

    return (
        <div className="flex flex-col gap-6 animate-enter">
            <div className="flex flex-col gap-3">
                <ExpandableTextarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your secret text here..."
                    className={cn(
                        "flex-1 min-h-[140px] bg-white/5 border text-white rounded-2xl p-4 focus:outline-none focus:ring-1 transition-all duration-300 placeholder:text-gray-600 resize-none",
                        isOverLimit
                            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50'
                            : 'border-white/10 focus:border-primary/50 focus:bg-white/[0.07]'
                    )}
                    footer={footerContent}
                />

                <div className="px-1">
                    {footerContent}
                </div>

                {maxBytes === 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 animate-slide-up">
                         <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                         <Typography variant="caption" className="text-red-400 font-bold">
                            Image too small to hide data. Please upload a larger image.
                        </Typography>
                    </div>
                )}
            </div>

            <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Encryption Password"
                startIcon={<IconLock className="w-5 h-5" />}
            />

            {resultBlobUrl ? (
                <div className="animate-slide-up bg-surface-raised/50 border border-white/10 backdrop-blur-md p-5 rounded-3xl flex items-center justify-between shadow-xl">
                    <div className="flex flex-col justify-center max-w-[70%]">
                        <Typography variant="label" className="text-white mb-1 truncate" title={downloadName}>
                            {downloadName}
                        </Typography>
                        <div className="flex items-center gap-2">
                             <div className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                                Encoded
                             </div>
                             <Typography variant="caption">{formatBytes(resultSize)}</Typography>
                        </div>
                    </div>
                    <a
                        href={resultBlobUrl}
                        download={downloadName}
                        className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20 hover:shadow-primary/40 group border border-white/10"
                        aria-label="Download encoded image"
                    >
                        <IconDownload className="w-6 h-6 group-hover:animate-bounce" />
                    </a>
                </div>
            ) : (
                <div className="relative overflow-hidden rounded-2xl group">
                     <Button
                        onClick={() => image && onEncode(image)}
                        disabled={isProcessing || !message || isOverLimit || !password}
                        isLoading={isProcessing}
                        loadingText={getButtonLabel()}
                        icon={!isProcessing && <IconEyeOff className="w-5 h-5" />}
                        className="w-full text-base py-5 shadow-xl"
                    >
                        {!isProcessing && "Conceal Text"}
                    </Button>

                    {/* Progress Bar Overlays */}
                    {isProcessing && stage === 'processing' && (
                        <div className="absolute inset-0 bg-white/20 z-20 pointer-events-none transition-all duration-100 ease-linear mix-blend-overlay" style={{ width: `${progress}%` }}></div>
                    )}
                    {isProcessing && stage !== 'processing' && (
                         <div className="absolute inset-0 bg-white/10 z-20 pointer-events-none animate-pulse mix-blend-overlay"></div>
                    )}
                </div>
            )}
        </div>
    );
};
