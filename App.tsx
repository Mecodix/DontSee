import React, { useState } from 'react';
import { AppMode } from './types';
import { IconBlinkingEye, IconHeart } from './components/Icons';
import { Toast } from './components/Toast';
import { ImagePreview } from './components/ImagePreview';
import { ConcealView } from './components/ConcealView';
import { RevealView } from './components/RevealView';
import { calculateMaxBytes, getByteLength } from './utils/capacity';
import { useImageHandler } from './hooks/useImageHandler';
import { useSteganography } from './hooks/useSteganography';

// Helper to format bytes
const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const App: React.FC = () => {
    const [mode, setMode] = useState<AppMode>(AppMode.HIDE);
    // Local scanning state to prevent flickering on upload
    const [isScanning, setIsScanning] = useState(false);
    // New state for browser decoding phase
    const [isReading, setIsReading] = useState(false);

    const { image, processFile, resetImage } = useImageHandler();

    const {
        password, setPassword,
        message, setMessage,
        decodedMessage, setDecodedMessage,
        isProcessing,
        progress,
        stage,
        notification,
        resultBlobUrl,
        resultSize,
        hasSignature,
        requiresPassword,
        maxBytes,
        setMaxBytes, // Exposed for manual override
        processEncode,
        processDecode,
        handleImageScan,
        resetStegoState,
        notify
    } = useSteganography();

    const reset = () => {
        resetImage();
        resetStegoState();
        setMode(AppMode.HIDE); // Reset to default mode
        setIsScanning(false);
        setIsReading(false);
    };

    // Handle Auto-Switch Logic based on Scan
    const onImageLoaded = async (img: HTMLImageElement) => {
        setIsReading(false); // Image is fully loaded in DOM
        setIsScanning(true); // Start analyzing signature
        try {
            await handleImageScan(img, mode);
        } finally {
             setIsScanning(false);
        }
    };

    // "Smart Drop" Logic: Auto-switch when signature state is determined
    React.useEffect(() => {
        if (image && hasSignature && !isScanning) {
            setMode(AppMode.SEE);
        } else if (image && !hasSignature && !isScanning) {
            setMode(AppMode.HIDE);
        }
    }, [hasSignature, image, isScanning]);


    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Immediate feedback: Set reading to true
            setIsReading(true);
            resetStegoState();

            processFile(
                file,
                (img) => onImageLoaded(img),
                (msg) => {
                    notify('error', msg || 'Failed to load image');
                    setIsReading(false);
                }
            );
        }
        e.target.value = '';
    };

    const handleFileDrop = (file: File) => {
        // Immediate feedback: Set reading to true
        setIsReading(true);
        resetStegoState();

        processFile(
            file,
            (img) => onImageLoaded(img),
            (msg) => {
                notify('error', msg || 'Failed to load image');
                setIsReading(false);
            }
        );
    };

    const handleReConceal = () => {
        setMode(AppMode.HIDE);
        resetStegoState();
        if (image) {
            try {
                const cap = calculateMaxBytes(image.imgObject.width, image.imgObject.height);
                setMaxBytes(cap);
            } catch(e) {
                console.error("Capacity calc error", e);
            }
        }
    };

    const currentBytes = getByteLength(message);

    const getButtonLabel = () => {
        if (!isProcessing) return null;
        if (stage === 'analyzing') return 'Preparing...';
        if (stage === 'rendering') return 'Finalizing...';
        return `${progress}%`;
    };

    // Dynamic Header Text - Prioritize Scanning/Reading State
    const headerTitle = isReading
        ? "Reading Image..."
        : (isScanning
            ? "Analyzing Image..."
            : (!image ? "Hide or Reveal Secrets" : (mode === AppMode.HIDE ? "Conceal Text" : "Reveal Secret")));

    const headerDesc = isReading
        ? "Decoding image data..."
        : (isScanning
            ? "Please wait while we check for hidden messages..."
            : (!image
                ? "Upload a DontSee image to decrypt, or any image to hide a new message."
                : (mode === AppMode.HIDE
                ? "Hide text inside images using steganography. Optionally add a password for AES-GCM encryption."
                : (requiresPassword
                    ? "Locked message detected. Enter password to reconstruct the scattered data."
                    : "Hidden message found. Click Reveal to read the secret."))));

    return (
        <div className="min-h-screen w-full flex flex-col items-center py-8 px-4">
            <Toast notification={notification} />

            <header className="w-full max-w-5xl flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                    <div className="bg-primary text-on-primary p-2.5 rounded-xl">
                        <IconBlinkingEye className="w-6 h-6" />
                    </div>
                    <h1 className="text-3xl font-bold font-brand text-white">Dont<span className="text-primary">See</span></h1>
                </div>
            </header>

            <main className="w-full max-w-5xl bg-surface-container border border-secondary-container rounded-[32px] overflow-hidden shadow-xl flex flex-col md:flex-row min-h-[550px]">
                
                <div className="md:w-1/3 bg-[#2b2930] p-8 flex flex-col border-b md:border-b-0 md:border-r border-secondary-container justify-center">
                    {/* Unified Header: No Tabs */}
                    <div className="flex flex-col gap-4">
                        <h2 className="text-3xl font-bold text-white font-brand transition-all duration-300 animate-slide-up" key={headerTitle}>
                            {headerTitle}
                        </h2>
                        <p className="text-white/70 text-sm leading-relaxed animate-slide-up" key={headerDesc}>
                            {headerDesc}
                        </p>
                    </div>
                </div>

                <div className="flex-1 p-8 flex flex-col relative">
                    
                    <ImagePreview 
                        image={image} 
                        hasSignature={hasSignature} 
                        requiresPassword={requiresPassword}
                        onReset={reset} 
                        onFileSelect={handleFileSelect} 
                        onFileDrop={handleFileDrop}
                        isLoading={isReading || isScanning}
                    />

                    {(image || isScanning || isReading) && (
                        <div className="flex-1 flex flex-col gap-5 animate-slide-up mt-8">
                            
                            {(isScanning || isReading) ? (
                                <div className="flex-1 flex items-center justify-center h-full min-h-[200px]">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                        <p className="text-outline text-sm font-mono">
                                            {isReading ? "Decoding image data..." : "Scanning for signature..."}
                                        </p>
                                    </div>
                                </div>
                            ) : (image && (
                                mode === AppMode.HIDE ? (
                                    <ConcealView
                                        image={image}
                                        message={message}
                                        setMessage={setMessage}
                                        password={password}
                                        setPassword={setPassword}
                                        maxBytes={maxBytes}
                                        currentBytes={currentBytes}
                                        isProcessing={isProcessing}
                                        stage={stage}
                                        progress={progress}
                                        resultBlobUrl={resultBlobUrl}
                                        resultSize={resultSize}
                                        onEncode={processEncode}
                                        getButtonLabel={getButtonLabel}
                                        formatBytes={formatBytes}
                                    />
                                ) : (
                                    <RevealView
                                        image={image}
                                        password={password}
                                        setPassword={setPassword}
                                        decodedMessage={decodedMessage}
                                        requiresPassword={requiresPassword}
                                        hasSignature={hasSignature}
                                        isProcessing={isProcessing}
                                        stage={stage}
                                        progress={progress}
                                        onDecode={processDecode}
                                        onReConceal={handleReConceal}
                                        getButtonLabel={getButtonLabel}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
            </main>

            <footer className="mt-12 text-center flex items-center justify-center gap-2 text-outline text-sm font-medium font-brand">
                Crafted with <IconHeart className="w-4 h-4 text-primary" /> by Ayush
            </footer>
        </div>
    );
};

export default App;
