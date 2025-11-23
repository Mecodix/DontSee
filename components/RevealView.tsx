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
                        // autoFocus removed
                    />
                </div>
            )}

            {decodedMessage && (
                <div className="relative group animate-slide-up">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>

                    {/* Fixed Height Container */}
                    <div className="relative bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-xl h-48">
                         {/* We pass 'h-full' to the textarea so it fills the 48 unit height container.
                             ExpandableTextarea handles the scroll internally via the textarea element. */}
                        <ExpandableTextarea
                            value={decodedMessage}
                            readOnly
                            className="bg-transparent border-none text-primary font-mono text-sm p-5 focus:outline-none focus:ring-0 resize-none w-full h-full"
                            placeholder="Decoded text will appear here..."
                            // Ensure the internal textarea takes full height
                            style={{ height: '100%' }}
                        />
                    </div>
                </div>
            )}

            <div className="relative overflow-hidden rounded-2xl">
                {/* Updated Button Color to match standard primary UI (consistent with Conceal) */}
                <Button
                    variant="primary"
                    onClick={() => image && onDecode(image)}
                    disabled={isProcessing || !hasSignature}
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

            <div className="w-full text-center mt-2 animate-slide-up delay-100">
                <button
                    onClick={onReConceal}
                    className="text-sm text-gray-500 hover:text-primary transition-colors py-2 px-4 rounded-lg hover:bg-white/5"
                >
                    Want to use this image again? <strong className="text-gray-300 group-hover:text-primary">Re-Conceal</strong>
                </button>
            </div>
        </div>
    );
};
