import React from 'react';
import { IconLock, IconDownload, IconEyeOff } from './Icons';
import { AppImage, ProcessingStage } from '../types';
import { ExpandableTextarea } from './ExpandableTextarea';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Typography } from './ui/Typography';
import { Card } from './ui/Card';
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
            <div className="flex-1 h-1.5 bg-surface/50 rounded-full overflow-hidden border border-white/5">
                <div
                    className={cn(
                        "h-full transition-all duration-300 shadow-[0_0_10px_currentColor]",
                        isOverLimit ? 'bg-error text-error' : 'bg-primary text-primary'
                    )}
                    style={{ width: `${usagePercent}%` }}
                ></div>
            </div>
            <Typography variant="mono" className={cn(
                "text-[10px]",
                isOverLimit ? 'text-error' : 'text-gray-500'
            )}>
                {currentBytes}/{maxBytes} B
            </Typography>
        </div>
    );

    return (
        <div className="flex flex-col gap-4 animate-enter">
            {/* Bento Block 1: Input Area */}
            <Card variant="default" className="p-1">
                <ExpandableTextarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your secret text here..."
                    className={cn(
                        "flex-1 min-h-[160px] bg-transparent border-0 text-white p-5 focus:outline-none focus:ring-0 placeholder:text-gray-600 resize-none font-medium leading-relaxed",
                         // Remove internal borders, let the Card handle it
                    )}
                    footer={
                        <div className="px-5 pb-4 pt-2">
                             {footerContent}
                        </div>
                    }
                />
            </Card>

             {maxBytes === 0 && (
                <div className="bg-error/10 border border-error/20 rounded-xl p-4 flex items-center gap-3 animate-slide-up">
                        <div className="w-2 h-2 rounded-full bg-error animate-pulse"></div>
                        <Typography variant="caption" className="text-error font-bold">
                        Image too small. Please use a larger image.
                    </Typography>
                </div>
            )}

            {/* Bento Block 2: Security & Actions */}
            <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-4">
                <Card variant="glass" className="p-1 flex items-center">
                    <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password (Optional)"
                        startIcon={<IconLock className="w-5 h-5" />}
                        className="bg-transparent border-0 rounded-none focus:bg-transparent focus:shadow-none h-full"
                    />
                </Card>

                {/* Action Button */}
                 <div className="relative h-14">
                    {resultBlobUrl ? (
                         <a
                            href={resultBlobUrl}
                            download={downloadName}
                            className="w-full h-full flex items-center justify-center gap-2 bg-success text-white rounded-2xl font-bold shadow-[0_0_20px_-5px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.6)] transition-all hover:-translate-y-1 active:scale-95 border border-white/20"
                         >
                            <IconDownload className="w-5 h-5 animate-bounce" />
                            <span>Download</span>
                         </a>
                    ) : (
                        <Button
                            onClick={() => image && onEncode(image)}
                            disabled={isProcessing || !message || isOverLimit}
                            isLoading={isProcessing}
                            loadingText={getButtonLabel()}
                            icon={!isProcessing && <IconEyeOff className="w-5 h-5" />}
                            className="w-full h-full text-base rounded-2xl shadow-xl"
                        >
                            {!isProcessing && "Conceal"}
                        </Button>
                    )}
                 </div>
            </div>

            {/* Result Status - Only appears on success */}
             {resultBlobUrl && (
                <div className="animate-slide-up bg-surface/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                     <div className="flex flex-col overflow-hidden">
                        <Typography variant="label" className="text-gray-300 truncate w-48">
                            {downloadName}
                        </Typography>
                        <Typography variant="caption" className="text-success">
                            {formatBytes(resultSize)} • Ready to Save
                        </Typography>
                     </div>
                     <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_10px_#22c55e]"></div>
                </div>
            )}
        </div>
    );
};
