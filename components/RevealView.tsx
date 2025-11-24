import React from 'react';
import { IconLock, IconZap } from './Icons';
import { AppImage, ProcessingStage } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
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
        <div className="flex flex-col gap-5 animate-enter">
            {requiresPassword && (
                <div className="animate-slide-up">
                    <Card variant="glass" className="p-1">
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter Password to Unlock"
                            startIcon={<IconLock className="w-5 h-5" />}
                            className="bg-transparent border-0 rounded-none focus:bg-transparent focus:shadow-none"
                        />
                    </Card>
                </div>
            )}

            {decodedMessage ? (
                <div className="animate-slide-up">
                    <Card variant="glass" className="h-64 flex flex-col p-6 border-primary/20 bg-primary/5">
                        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
                             <Typography variant="label" className="text-primary">Decoded Secret</Typography>
                             <div className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                                 Success
                             </div>
                        </div>
                        <div className="flex-1 w-full overflow-y-auto pr-2 custom-scrollbar text-white/90 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap selection:bg-primary selection:text-white">
                            {decodedMessage}
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                    <Button
                        variant="primary"
                        onClick={() => image && onDecode(image)}
                        disabled={isProcessing || !hasSignature}
                        isLoading={isProcessing}
                        loadingText={getButtonLabel()}
                        icon={!isProcessing && <IconZap className="w-5 h-5" />}
                        className="w-full h-16 text-lg tracking-wide"
                    >
                        {!isProcessing && "Reveal Hidden Text"}
                    </Button>

                     {/* Progress Bar Overlays */}
                     {isProcessing && stage === 'processing' && (
                        <div className="absolute inset-0 bg-white/20 z-20 pointer-events-none transition-all duration-100 ease-linear mix-blend-overlay" style={{ width: `${progress}%` }}></div>
                    )}
                </div>
            )}

            {decodedMessage && (
                <div className="w-full text-center mt-4 animate-slide-up delay-100">
                    <button
                        onClick={onReConceal}
                        className="group text-sm text-gray-500 hover:text-white transition-all py-3 px-6 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10"
                    >
                        Want to overwrite this? <span className="text-primary font-bold group-hover:text-primary-hover ml-1">Re-Conceal</span>
                    </button>
                </div>
            )}
        </div>
    );
};
