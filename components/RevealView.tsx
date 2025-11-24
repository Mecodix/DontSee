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
                    <fieldset className="border border-white/10 rounded-2xl p-5 pt-2 min-h-[100px] max-h-[300px] flex flex-col shadow-inner transition-all duration-300 bg-white/5">
                        <legend className="px-2 text-[10px] font-bold text-primary/80 uppercase tracking-widest border border-white/5 rounded-full shadow-sm mx-4 bg-transparent">
                            Decoded Text
                        </legend>
                         <div className="flex-1 w-full h-full overflow-y-auto pr-2 custom-scrollbar text-white/90 font-sans text-base leading-relaxed break-words whitespace-pre-wrap mt-2">
                            {decodedMessage}
                         </div>
                    </fieldset>
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
