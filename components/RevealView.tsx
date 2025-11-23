import React from 'react';
import { IconLock, IconZap } from './Icons';
import { AppImage, ProcessingStage } from '../types';
import { ExpandableTextarea } from './ExpandableTextarea';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Typography } from './ui/Typography';

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
                <div className="animate-slide-up">
                    <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter Password to Unlock"
                        startIcon={<IconLock className="w-5 h-5" />}
                    />
                </div>
            )}

            {decodedMessage && (
                <ExpandableTextarea
                    value={decodedMessage}
                    readOnly
                    className="bg-surface-container border-primary/50 text-primary font-mono text-sm rounded-2xl focus:outline-none focus:ring-1 transition-colors animate-slide-up"
                    maxHeight="h-40"
                    placeholder="Decoded message will appear here..."
                />
            )}

            <div className="relative overflow-hidden rounded-2xl">
                <Button
                    variant="secondary"
                    onClick={() => image && onDecode(image)}
                    disabled={isProcessing || !hasSignature}
                    isLoading={isProcessing}
                    loadingText={getButtonLabel()}
                    icon={!isProcessing && <IconZap className="w-5 h-5" />}
                    className="w-full"
                >
                    {!isProcessing && "Reveal"}
                </Button>

                 {/* Progress Bar Overlays */}
                 {isProcessing && stage === 'processing' && (
                    <div className="absolute inset-0 bg-white/10 z-20 pointer-events-none transition-all duration-100 ease-linear mix-blend-overlay" style={{ width: `${progress}%` }}></div>
                )}
                {isProcessing && stage !== 'processing' && (
                     <div className="absolute inset-0 bg-white/5 z-20 pointer-events-none animate-pulse mix-blend-overlay"></div>
                )}
            </div>

            <div className="w-full text-center mt-4 animate-slide-up">
                <button onClick={onReConceal} className="text-sm text-outline hover:text-primary transition-colors">
                    Want to use this image again? <strong>Re-Conceal</strong>
                </button>
            </div>
        </>
    );
};
