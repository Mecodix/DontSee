import React from 'react';
import { Lock, Unlock, RefreshCw, Key, ShieldCheck, Copy, Check } from 'lucide-react';
import { AppImage, ProcessingStage } from '../types';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import { motion, AnimatePresence } from 'framer-motion';

interface RevealViewProps {
    image: AppImage | null;
    password: string;
    setPassword: (pwd: string) => void;
    decodedMessage: string | null;
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
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        if (decodedMessage) {
            navigator.clipboard.writeText(decodedMessage);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (decodedMessage !== null) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-6 h-full"
            >
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                    <div className="bg-emerald-500/20 p-2 rounded-full">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-emerald-200 font-bold text-sm">Decryption Successful</h3>
                        <p className="text-emerald-200/60 text-xs">The hidden message has been fully recovered.</p>
                    </div>
                </div>

                <div className="relative flex-1">
                    <Textarea
                        value={decodedMessage}
                        readOnly
                        className="font-mono text-sm min-h-[200px] bg-black/20"
                    />
                    <div className="absolute top-2 right-12 z-10">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopy}
                            className="h-8 w-8 p-0 hover:bg-white/10"
                            title="Copy to clipboard"
                        >
                            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                        </Button>
                    </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-white/5">
                    <Button
                        onClick={onReConceal}
                        variant="secondary"
                        className="flex-1"
                        leftIcon={<RefreshCw size={18} />}
                    >
                        Hide New Message
                    </Button>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                 <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {requiresPassword ? <Lock className="text-amber-400" /> : <Unlock className="text-emerald-400" />}
                    {requiresPassword ? "Locked Message Detected" : "Message Detected"}
                 </h3>
                 <p className="text-white/50 text-sm">
                    {requiresPassword
                        ? "This image contains a password-protected message. Enter the correct password to decrypt it."
                        : "A hidden message has been found. Click reveal to decrypt it."}
                 </p>
            </div>

            {requiresPassword && (
                <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Decryption Password"
                    leftIcon={<Key size={18} />}
                    autoFocus
                />
            )}

            <Button
                onClick={() => image && onDecode(image)}
                disabled={isProcessing || (requiresPassword && !password)}
                isLoading={isProcessing}
                variant="primary"
                size="lg"
                className="w-full mt-4"
                leftIcon={!isProcessing && <Unlock size={20} />}
            >
                {isProcessing ? getButtonLabel() : "Reveal Message"}
            </Button>

            {/* Disclaimer */}
            <p className="text-center text-xs text-white/30 mt-2">
                Decryption occurs locally in your browser.
            </p>
        </div>
    );
};
