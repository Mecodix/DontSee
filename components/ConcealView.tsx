import React from 'react';
import { IconLock, IconDownload, IconEyeOff } from './Icons';
import { AppImage, ProcessingStage } from '../types';

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

    return (
        <>
            <div className="flex flex-col gap-2">
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter secret message here..."
                    className={`flex-1 bg-surface border text-white rounded-2xl p-4 resize-none focus:outline-none focus:ring-1 transition-colors placeholder-outline min-h-[120px]
                    ${isOverLimit ? 'border-error focus:border-error focus:ring-error' : 'border-secondary-container focus:border-primary focus:ring-primary'}`}
                ></textarea>

                <div className="flex items-center gap-3 px-1">
                    <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-300 ${isOverLimit ? 'bg-error' : 'bg-primary'}`}
                            style={{ width: `${usagePercent}%` }}
                        ></div>
                    </div>
                    <span className={`text-xs font-mono ${isOverLimit ? 'text-error font-bold' : 'text-outline'}`}>
                        {currentBytes} / {maxBytes} bytes
                    </span>
                </div>
            </div>

            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <IconLock className="text-outline" />
                </div>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set Password (Optional)"
                    className="w-full bg-surface border border-secondary-container text-white text-sm rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-outline"
                />
            </div>

            {resultBlobUrl ? (
                <div className="animate-slide-up bg-[#2b2930] border border-secondary-container p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex flex-col justify-center max-w-[70%]">
                        <p className="text-white font-bold text-sm mb-0.5 truncate" title={image ? `${image.name.split('.').slice(0, -1).join('.')}_secure.png` : 'dontsee_secure.png'}>
                            {image ? `${image.name.split('.').slice(0, -1).join('.')}_secure.png` : 'dontsee_secure.png'}
                        </p>
                        <p className="text-outline text-xs font-mono">{formatBytes(resultSize)}</p>
                    </div>
                    <a
                        href={resultBlobUrl}
                        download={image ? `${image.name.split('.').slice(0, -1).join('.')}_secure.png` : 'dontsee_secure.png'}
                        className="w-12 h-12 bg-primary hover:bg-white text-on-primary rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-lg flex-shrink-0"
                        aria-label="Download encoded image"
                    >
                        <IconDownload className="w-6 h-6" />
                    </a>
                </div>
            ) : (
                <button onClick={() => image && onEncode(image)} disabled={isProcessing || !message || isOverLimit}
                    aria-label="Encrypt and conceal message"
                    className={`py-4 rounded-2xl font-bold text-sm uppercase tracking-wider shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-2 relative overflow-hidden
                    ${(!message || isOverLimit) ? 'bg-surface-container text-secondary-container border border-secondary-container cursor-not-allowed' : 'bg-primary hover:bg-white text-on-primary shadow-primary/10'}`}>

                    {isProcessing ? (
                        <div className="flex items-center gap-2 z-10 relative">
                            <div className="w-5 h-5 border-4 border-on-primary/30 border-t-on-primary rounded-full animate-spin-slow" aria-label="Processing"></div>
                            <span>{getButtonLabel()}</span>
                        </div>
                    ) : (
                        <><IconEyeOff className="w-5 h-5"/> Conceal</>
                    )}

                    {isProcessing && stage === 'processing' && (
                        <div className="absolute inset-0 bg-white/20 z-0 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }}></div>
                    )}
                    {isProcessing && stage !== 'processing' && (
                        <div className="absolute inset-0 bg-white/10 z-0 animate-pulse"></div>
                    )}
                </button>
            )}
        </>
    );
};
