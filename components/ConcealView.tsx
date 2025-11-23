import React from 'react';
import { Lock, Download, EyeOff, Check, AlertCircle } from 'lucide-react';
import { AppImage, ProcessingStage } from '../types';
import { Textarea } from './ui/Textarea';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { motion, AnimatePresence } from 'framer-motion';

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
        <div className="flex flex-col gap-2 w-full mt-2">
            <div className="flex justify-between items-end">
                 <span className={`text-xs font-mono transition-colors ${isOverLimit ? 'text-red-400 font-bold' : 'text-white/40'}`}>
                    {formatBytes(currentBytes)} / {formatBytes(maxBytes)}
                </span>
                <span className="text-xs text-white/20">{Math.round(usagePercent)}%</span>
            </div>
            <div className="flex-1 h-1.5 bg-surface-raised rounded-full overflow-hidden border border-white/5">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${usagePercent}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className={`h-full ${isOverLimit ? 'bg-red-500' : 'bg-primary'}`}
                />
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="space-y-4">
                <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter the secret message you want to hide..."
                    className={isOverLimit ? "border-red-500/50 focus:border-red-500" : ""}
                    footer={footerContent}
                />

                <AnimatePresence>
                    {maxBytes === 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3"
                        >
                            <AlertCircle className="text-red-400 w-5 h-5 flex-shrink-0" />
                            <p className="text-sm text-red-200">
                                Image too small to hide data. Please upload a larger image.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Encryption Password (Optional)"
                leftIcon={<Lock size={18} />}
            />

            <AnimatePresence mode="wait">
                {resultBlobUrl ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Card variant="solid" className="p-4 flex items-center justify-between border-primary/20 bg-primary/5">
                            <div className="flex flex-col justify-center max-w-[70%]">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="bg-emerald-500/20 p-1 rounded-full">
                                        <Check size={12} className="text-emerald-400" />
                                    </div>
                                    <p className="text-white font-bold text-sm truncate" title={downloadName}>
                                        {downloadName}
                                    </p>
                                </div>
                                <p className="text-white/50 text-xs font-mono pl-7">{formatBytes(resultSize)}</p>
                            </div>
                            <Button
                                href={resultBlobUrl}
                                as="a"
                                download={downloadName}
                                variant="primary"
                                size="sm"
                                className="rounded-full w-12 h-12 p-0 flex items-center justify-center"
                                leftIcon={<Download size={20} />}
                            />
                        </Card>
                    </motion.div>
                ) : (
                    <Button
                        onClick={() => image && onEncode(image)}
                        disabled={isProcessing || !message || isOverLimit}
                        isLoading={isProcessing}
                        variant={(!message || isOverLimit) ? "secondary" : "primary"}
                        size="lg"
                        className="w-full relative overflow-hidden group"
                        leftIcon={!isProcessing && <EyeOff size={20} />}
                    >
                        {isProcessing ? (
                           <span className="relative z-10">{getButtonLabel()}</span>
                        ) : "Conceal Message"}

                        {/* Progress Bar Background */}
                        {isProcessing && stage === 'processing' && (
                            <motion.div
                                className="absolute inset-0 bg-black/10 z-0 origin-left"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: progress / 100 }}
                                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                            />
                        )}
                    </Button>
                )}
            </AnimatePresence>
        </div>
    );
};
