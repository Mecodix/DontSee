import React from 'react';
import { AppMode, AppImage } from './types';
import { Toast } from './components/Toast';
import { ImagePreview } from './components/ImagePreview';
import { ConcealView } from './components/ConcealView';
import { RevealView } from './components/RevealView';
import { calculateMaxBytes, getByteLength } from './utils/capacity';
import { useImageHandler } from './hooks/useImageHandler';
import { useSteganography } from './hooks/useSteganography';
import { usePasteHandler } from './hooks/usePasteHandler';
import { useGlobalDragDrop } from './hooks/useGlobalDragDrop';
import { Eye, Heart, Sparkles } from 'lucide-react';
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

const App: React.FC = () => {
    const [mode, setMode] = React.useState<AppMode>(AppMode.HIDE);
    const [isScanning, setIsScanning] = React.useState(false);
    const [isReading, setIsReading] = React.useState(false);

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


    const handleFileProcess = (file: File) => {
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileProcess(file);
        }
        e.target.value = '';
    };

    const { isDragging } = useGlobalDragDrop(handleFileProcess);

    usePasteHandler(
        (file) => handleFileProcess(file),
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

    return (
        <div className="min-h-screen w-full bg-surface text-white selection:bg-primary/30 selection:text-white relative overflow-x-hidden font-sans">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 bg-aurora opacity-40 pointer-events-none" />
            <div className="fixed inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none mix-blend-overlay" />

            <Toast notification={notification} />

            {/* Global Drop Overlay */}
            <div className={cn(
                "fixed inset-0 z-[999] bg-surface/90 backdrop-blur-xl flex flex-col items-center justify-center transition-all duration-300 pointer-events-none",
                isDragging ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}>
                <div className="bg-primary/10 p-8 rounded-full mb-6 border border-primary/20 animate-bounce">
                    <Sparkles className="w-16 h-16 text-primary" />
                </div>
                <h2 className="text-4xl font-bold text-white font-brand">Drop Image Here</h2>
            </div>

            <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-12 flex flex-col min-h-screen">
                
                {/* Header */}
                <header className="flex justify-between items-center mb-16">
                    <div className="flex items-center gap-3 group cursor-default">
                        <div className="bg-gradient-to-br from-primary to-purple-600 text-white p-2.5 rounded-xl shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
                            <Eye className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-bold font-brand tracking-tight">
                            Dont<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-300">See</span>
                        </h1>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 w-full grid md:grid-cols-[1fr,1.5fr] gap-8 items-start">
                    
                    {/* Left Column: Image Preview & Status */}
                    <div className="flex flex-col gap-6 sticky top-8">
                        <div className="flex flex-col gap-2 mb-4">
                            <h2 className="text-4xl font-bold font-brand leading-tight text-white">
                                {isReading ? "Decoding..." :
                                 isScanning ? "Scanning..." :
                                 !image ? "Secure Steganography" :
                                 mode === AppMode.HIDE ? "Conceal Secrets" : "Unlock Message"}
                            </h2>
                            <p className="text-lg text-white/50 leading-relaxed max-w-md">
                                {isReading ? "Reading image data into memory." :
                                 isScanning ? "Analyzing pixel structure for hidden signatures." :
                                 !image ? "Hide messages inside images with military-grade encryption." :
                                 mode === AppMode.HIDE ? "Encrypt and hide text within the image pixels." :
                                 "Decrypt and reveal the hidden message."}
                            </p>
                        </div>

                        <ImagePreview
                            image={image}
                            hasSignature={hasSignature}
                            requiresPassword={requiresPassword}
                            onReset={reset}
                            onFileSelect={handleFileSelect}
                            onFileDrop={handleFileProcess}
                            isLoading={isReading || isScanning}
                        />
                    </div>

                    {/* Right Column: Interaction Area */}
                    <div className="relative min-h-[400px]">
                        {(image || isScanning || isReading) ? (
                             <div className="animate-slide-up">
                                {(isScanning || isReading) ? (
                                    <div className="w-full h-[400px] flex flex-col items-center justify-center border border-white/5 rounded-3xl bg-surface-glass backdrop-blur-xl">
                                        <div className="relative">
                                            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Sparkles size={20} className="text-primary animate-pulse" />
                                            </div>
                                        </div>
                                        <p className="mt-6 text-sm font-mono text-white/50 uppercase tracking-widest">Processing</p>
                                    </div>
                                ) : (image && (
                                    <div className="bg-surface-glass backdrop-blur-xl border border-white/10 rounded-[40px] p-8 shadow-2xl">
                                        {mode === AppMode.HIDE ? (
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
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Empty State / Placeholder for right column
                            <div className="hidden md:flex h-full items-center justify-center border border-dashed border-white/5 rounded-3xl p-12 text-center opacity-50">
                                <p className="text-white/30">Upload an image to get started</p>
                            </div>
                        )}
                    </div>
                </main>

                <footer className="mt-20 text-center flex items-center justify-center gap-2 text-white/30 text-sm font-medium">
                    Crafted with <Heart className="w-4 h-4 text-primary fill-primary/20" /> by Ayush
                </footer>
            </div>
        </div>
    );
};

export default App;
