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
            <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                <div
                    className={cn(
                        "h-full transition-all duration-300",
                        isOverLimit ? 'bg-error' : 'bg-primary'
                    )}
                    style={{ width: `${usagePercent}%` }}
                ></div>
            </div>
            <Typography variant="caption" className={isOverLimit ? 'text-error font-bold' : ''}>
                {currentBytes} / {maxBytes} bytes
            </Typography>
        </div>
    );

    return (
        <>
            <div className="flex flex-col gap-2">
                <ExpandableTextarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter secret message here..."
                    className={cn(
                        "flex-1 min-h-[120px] bg-surface border text-white rounded-2xl focus:outline-none focus:ring-1 transition-colors placeholder-outline",
                        isOverLimit
                            ? 'border-error focus:border-error focus:ring-error'
                            : 'border-secondary-container focus:border-primary focus:ring-primary'
                    )}
                    footer={footerContent}
                />

                <div className="px-1">
                    {footerContent}
                </div>

                {maxBytes === 0 && (
                    <Typography variant="caption" className="text-error font-bold px-1 animate-slide-up">
                        Image too small to hide data. Please upload a larger image.
                    </Typography>
                )}
            </div>

            <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set Password (Optional)"
                startIcon={<IconLock className="w-5 h-5" />}
            />

            {resultBlobUrl ? (
                <div className="animate-slide-up bg-surface-raised border border-secondary-container p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex flex-col justify-center max-w-[70%]">
                        <Typography variant="label" className="text-white mb-0.5 truncate" title={downloadName}>
                            {downloadName}
                        </Typography>
                        <Typography variant="caption">{formatBytes(resultSize)}</Typography>
                    </div>
                    <a
                        href={resultBlobUrl}
                        download={downloadName}
                        className="w-12 h-12 bg-primary hover:bg-white text-on-primary rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-lg flex-shrink-0"
                        aria-label="Download encoded image"
                    >
                        <IconDownload className="w-6 h-6" />
                    </a>
                </div>
            ) : (
                <div className="relative overflow-hidden rounded-2xl">
                     <Button
                        onClick={() => image && onEncode(image)}
                        disabled={isProcessing || !message || isOverLimit}
                        isLoading={isProcessing}
                        loadingText={getButtonLabel()}
                        icon={!isProcessing && <IconEyeOff className="w-5 h-5" />}
                        className="w-full"
                    >
                        {!isProcessing && "Conceal"}
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
        </>
    );
};
