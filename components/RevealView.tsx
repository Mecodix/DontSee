import React from 'react';
import { IconLock, IconZap } from './Icons';
import { AppImage, ProcessingStage } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
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
        <div className="flex flex-col gap-6 animate-enter">
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
                <div className="animate-slide-up mt-2">
                    {/* Using ExpandableTextarea in Read-Only mode for Zen features */}
                    <ExpandableTextarea
                        value={decodedMessage}
                        readOnly={true}
                        label="Decoded Text"
                        maxHeight="h-[200px]"
                    />
                </div>
            )}

            <div className="relative overflow-hidden rounded-2xl">
                <Button
                    variant="primary"
                    onClick={() => image && onDecode(image)}
                    disabled={isProcessing || !password}
                    isLoading={isProcessing}
                    loadingText={getButtonLabel()}
                    icon={!isProcessing && <IconZap className="w-5 h-5" />}
                    className="w-full text-base py-5 shadow-xl"
                >
                    {!isProcessing && "Reveal Text"}
                </Button>

                 {/* Progress Bar Overlays */}
                 {isProcessing && stage === 'processing' && (
                    <div className="absolute inset-0 bg-white/20 z-20 pointer-events-none transition-all duration-100 ease-linear mix-blend-overlay" style={{ width: `${progress}%` }}></div>
                )}
                {isProcessing && stage !== 'processing' && (
                     <div className="absolute inset-0 bg-white/10 z-20 pointer-events-none animate-pulse mix-blend-overlay"></div>
                )}
            </div>

        </div>
    );
};
