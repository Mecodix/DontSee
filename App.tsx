import React, { useState } from 'react';
import { AppMode, AppImage } from './types';
import { IconBlinkingEye, IconHeart, IconFilePlus } from './components/Icons';
import { Toast } from './components/Toast';
import { ImagePreview } from './components/ImagePreview';
import { ConcealView } from './components/ConcealView';
import { RevealView } from './components/RevealView';
import { calculateMaxBytes, getByteLength } from './utils/capacity';
import { useImageHandler } from './hooks/useImageHandler';
import { useSteganography } from './hooks/useSteganography';
import { usePasteHandler } from './hooks/usePasteHandler';
import { useGlobalDragDrop } from './hooks/useGlobalDragDrop';
import { cn } from './utils/cn';

// Helper to format bytes
const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// Helper: Get Header Content
const getHeaderContent = (
    isReading: boolean,
    isScanning: boolean,
    image: AppImage | null,
    mode: AppMode,
    requiresPassword: boolean
) => {
    if (isReading) {
        return {
            title: "Reading Image...",
            desc: "Decoding image data..."
        };
    }
    if (isScanning) {
        return {
            title: "Analyzing...",
            desc: "Checking for hidden secrets..."
        };
    }
    if (!image) {
        return {
            title: "Secure Steganography",
            desc: "Hide secrets in plain sight. Upload an image to start."
        };
    }
    if (mode === AppMode.HIDE) {
        return {
            title: "Conceal",
            desc: "Encrypt and hide your message within the image pixels."
        };
    }
    // Reveal Mode
    if (requiresPassword) {
        return {
            title: "Locked Secret",
            desc: "This image contains a password-protected message."
        };
    }
    return {
        title: "Reveal",
        desc: "Hidden message found. Unlock to read."
    };
};

const App: React.FC = () => {
    const [mode, setMode] = useState<AppMode>(AppMode.HIDE);
    const [isScanning, setIsScanning] = useState(false);
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
        setMaxBytes,
        processEncode,
        processDecode,
        handleImageScan,
        resetStegoState,
        notify
    } = useSteganography();

    const reset = () => {
        resetImage();
        resetStegoState();
        setMode(AppMode.HIDE);
        setIsScanning(false);
        setIsReading(false);
    };

    const onImageLoaded = async (img: HTMLImageElement) => {
        setIsReading(false);
        setIsScanning(true);
        try {
            await handleImageScan(img, mode);
        } finally {
             setIsScanning(false);
        }
    };

    React.useEffect(() => {
        if (image && hasSignature && !isScanning) {
            setMode(AppMode.SEE);
        } else if (image && !hasSignature && !isScanning) {
            setMode(AppMode.HIDE);
        }
    }, [hasSignature, image, isScanning]);

    // Re-implemented helper to keep logic clean as requested in previous turn
    const processFileHelper = (file: File) => {
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFileHelper(file);
        e.target.value = '';
    };

    const handleFileDrop = (file: File) => {
        processFileHelper(file);
    };

    const { isDragging } = useGlobalDragDrop(handleFileDrop);

    usePasteHandler(
        (file) => processFileHelper(file),
        (errorMsg) => notify('error', errorMsg)
    );

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

    const { title: headerTitle, desc: headerDesc } = getHeaderContent(
        isReading,
        isScanning,
        image,
        mode,
        requiresPassword
    );

    return (
        <div className="min-h-screen w-full flex flex-col items-center py-6 px-4 relative overflow-x-hidden">
            <Toast notification={notification} />

            {/* Global Drop Overlay - Glassmorphism */}
            <div className={cn(
                "fixed inset-0 z-[999] bg-surface/80 backdrop-blur-md flex flex-col items-center justify-center transition-all duration-300 pointer-events-none",
                isDragging ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}>
                <div className="bg-primary/20 p-8 rounded-full mb-6 animate-bounce">
                    <IconFilePlus className="w-16 h-16 text-primary" />
                </div>
                <h2 className="text-4xl font-bold text-white font-brand">Drop Image Here</h2>
                <p className="text-outline mt-4 text-lg">Release to upload instantly</p>
            </div>

            {/* Main Brand Header - Mobile First: Top Center */}
            <header className="flex flex-col items-center gap-2 mb-8 animate-fade-in">
                <div className="flex items-center gap-3">
                    <div className="bg-surface-raised border border-white/10 p-2 rounded-xl shadow-lg shadow-primary/5">
                        <IconBlinkingEye className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold font-brand text-white tracking-tight">Dont<span className="text-primary">See</span></h1>
                </div>
            </header>

            {/* Main Card - Floating Glass Panel */}
            <main className={cn(
                "w-full max-w-xl bg-surface-glass backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-2xl shadow-black/50 flex flex-col gap-6 transition-all duration-500",
                "animate-slide-up"
            )}>
                
                {/* Dynamic Header Info */}
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-white font-brand animate-fade-in" key={headerTitle}>
                        {headerTitle}
                    </h2>
                    <p className="text-outline text-sm leading-relaxed max-w-sm mx-auto animate-fade-in" key={headerDesc}>
                        {headerDesc}
                    </p>
                </div>

                {/* Image Section */}
                <div className="w-full">
                    <ImagePreview 
                        image={image} 
                        hasSignature={hasSignature} 
                        requiresPassword={requiresPassword}
                        onReset={reset} 
                        onFileSelect={handleFileSelect} 
                        onFileDrop={handleFileDrop}
                        isLoading={isReading || isScanning}
                    />
                </div>

                {/* Actions Section - Fluid Transition */}
                {(image || isScanning || isReading) && (
                    <div className="w-full animate-fade-in">
                        {(isScanning || isReading) ? (
                            <div className="py-8 flex flex-col items-center gap-4">
                                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                <p className="text-outline text-sm font-mono animate-pulse">
                                    {isReading ? "Processing pixels..." : "Scanning image..."}
                                </p>
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
                            )
                        ))}
                    </div>
                )}
            </main>

            <footer className="mt-8 text-center flex items-center justify-center gap-2 text-white/20 text-xs font-medium font-brand animate-fade-in">
                Secure Client-Side Processing <IconHeart className="w-3 h-3 text-white/20" />
            </footer>
        </div>
    );
};

export default App;
