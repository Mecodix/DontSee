import React from 'react';
import { IconLock, IconZap } from './Icons';
import { AppImage, ProcessingStage } from '../types';
import { ExpandableTextarea } from './ExpandableTextarea';

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
        <>
            {requiresPassword && (
                <div className="relative animate-slide-up">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <IconLock className="text-outline" />
                    </div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter Password to Unlock"
                        className="w-full bg-surface border border-secondary-container text-white text-sm rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-outline"
                    />
                </div>
            )}

            {decodedMessage && (
                <div className="flex-1 w-full animate-slide-up mb-4">
                    <ExpandableTextarea
                        value={decodedMessage}
                        readOnly={true}
                        className="border-primary/50 bg-surface-container"
                    />
                </div>
            )}

            <button onClick={() => image && onDecode(image)} disabled={isProcessing || !hasSignature}
                className={`py-4 rounded-2xl font-bold text-sm uppercase tracking-wider shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-2 relative overflow-hidden
                ${isProcessing || !hasSignature ? 'bg-secondary-container text-outline cursor-not-allowed' : 'bg-secondary-container hover:bg-secondary-hover text-white shadow-secondary-container/20'}`}>

                {isProcessing ? (
                    <div className="flex items-center gap-2 z-10 relative">
                        <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin-slow"></div>
                        <span>{getButtonLabel()}</span>
                    </div>
                ) : (
                    <><IconZap className="w-5 h-5"/> Reveal</>
                )}

                {isProcessing && stage === 'processing' && (
                    <div className="absolute inset-0 bg-white/10 z-0 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }}></div>
                )}
                {isProcessing && stage !== 'processing' && (
                    <div className="absolute inset-0 bg-white/5 z-0 animate-pulse"></div>
                )}
            </button>

            <div className="w-full text-center mt-4 animate-slide-up">
                <button onClick={onReConceal} className="text-sm text-outline hover:text-primary transition-colors">
                    Want to use this image again? <strong>Re-Conceal</strong>
                </button>
            </div>
        </>
    );
};
