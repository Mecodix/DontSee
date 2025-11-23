import React from 'react';
import { IconLock, IconZap, IconEyeOff } from './Icons';
import { AppImage, ProcessingStage } from '../types';
import { cn } from '../utils/cn';

interface RevealViewProps {
    image: AppImage | null;
    password: string;
    setPassword: (pwd: string) => void;
    decodedMessage: string;
    requiresPassword: boolean;
    hasSignature: boolean;
    isProcessing: boolean;
    stage: ProcessingStage;
    progress: number;
    onDecode: (img: AppImage) => void;
    onReConceal: () => void;
    getButtonLabel: () => React.ReactNode;
}

export const RevealView: React.FC<RevealViewProps> = ({
    image,
    password,
    setPassword,
    decodedMessage,
    requiresPassword,
    hasSignature,
    isProcessing,
    stage,
    progress,
    onDecode,
    onReConceal,
    getButtonLabel
}) => {
    return (
        <div className="flex flex-col gap-5 animate-fade-in">
            {requiresPassword && (
                <div className="relative animate-slide-up group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-white/30 group-focus-within:text-primary transition-colors">
                        <IconLock className="w-5 h-5" />
                    </div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter Password to Unlock"
                        className="w-full bg-surface-raised/50 backdrop-blur-sm border border-white/10 text-white text-sm rounded-2xl py-5 pl-12 pr-5 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder-white/20 hover:border-white/20"
                    />
                </div>
            )}

            {decodedMessage && (
                <div className="bg-surface-raised/50 backdrop-blur-sm border border-primary/20 rounded-2xl p-6 flex items-center justify-center transition-all min-h-[140px] animate-scale-in shadow-inner">
                    <p className="w-full text-left text-primary font-mono text-sm break-words whitespace-pre-wrap leading-relaxed select-text">{decodedMessage}</p>
                </div>
            )}

            {!decodedMessage && (
                <button
                    onClick={() => image && onDecode(image)}
                    disabled={isProcessing || !hasSignature}
                    className={cn(
                        "py-5 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-3 relative overflow-hidden",
                        isProcessing || !hasSignature
                            ? "bg-surface-raised border border-white/5 text-white/20 cursor-not-allowed"
                            : "bg-gradient-to-r from-secondary-container to-secondary-hover hover:brightness-110 text-white shadow-black/30"
                    )}>

                    {isProcessing ? (
                        <div className="flex items-center gap-3 z-10 relative">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span className="animate-pulse">{getButtonLabel()}</span>
                        </div>
                    ) : (
                        <><IconZap className="w-5 h-5"/> Reveal Secret</>
                    )}

                    {isProcessing && stage === 'processing' && (
                        <div className="absolute inset-0 bg-white/10 z-0 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }}></div>
                    )}
                </button>
            )}

            <div className="w-full text-center mt-2 animate-fade-in">
                <button onClick={onReConceal} className="group text-xs text-white/40 hover:text-white transition-colors py-2">
                    Want to hide something else? <span className="text-primary group-hover:underline">Re-Conceal</span>
                </button>
            </div>
        </div>
    );
};
