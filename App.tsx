import React, { useState } from 'react';
import { AppMode } from './types';
import { IconBlinkingEye, IconDownload, IconEyeOff, IconHeart, IconLock, IconZap } from './components/Icons';
import { Toast } from './components/Toast';
import { ImagePreview } from './components/ImagePreview';
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
    };

    // Handle Auto-Switch Logic based on Scan
    const onImageLoaded = async (img: HTMLImageElement) => {
        setIsScanning(true);
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
            resetStegoState();
            setIsScanning(true);
            processFile(
                file,
                (img) => onImageLoaded(img),
                (msg) => {
                    notify('error', msg || 'Failed to load image');
                    setIsScanning(false);
                }
            );
        }
        e.target.value = '';
    };

    const handleFileDrop = (file: File) => {
        resetStegoState();
        setIsScanning(true);
        processFile(
            file,
            (img) => onImageLoaded(img),
            (msg) => {
                notify('error', msg || 'Failed to load image');
                setIsScanning(false);
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
    const usagePercent = maxBytes > 0 ? Math.min((currentBytes / maxBytes) * 100, 100) : 0;
    const isOverLimit = currentBytes > maxBytes;

    const getButtonLabel = () => {
        if (!isProcessing) return null;
        if (stage === 'analyzing') return 'Preparing...';
        if (stage === 'rendering') return 'Finalizing...';
        return `${progress}%`;
    };

    // Dynamic Header Text
    const headerTitle = !image
        ? "Hide or Reveal Secrets"
        : (isScanning ? "Analyzing Image..." : (mode === AppMode.HIDE ? "Conceal Text" : "Reveal Secret"));

    // Updated Description Logic to prioritize Steganography and fix inconsistencies
    const headerDesc = !image
        ? "Upload a DontSee image to decrypt, or any image to hide a new message."
        : (isScanning
            ? "Please wait while we check for hidden messages..."
            : (mode === AppMode.HIDE
                ? "Hide text inside images using steganography. Optionally add a password for AES-GCM encryption."
                : (requiresPassword
                    ? "Locked message detected. Enter password to reconstruct the scattered data."
                    : "Hidden message found. Click Reveal to read the secret.")));

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
                    />

                    {image && (
                        <div className="flex-1 flex flex-col gap-5 animate-slide-up mt-8">
                            
                            {isScanning ? (
                                <div className="flex-1 flex items-center justify-center h-full min-h-[200px]">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                        <p className="text-outline text-sm font-mono">Scanning for signature...</p>
                                    </div>
                                </div>
                            ) : (
                                mode === AppMode.HIDE ? (
                                    <>
                                        <div className="flex flex-col gap-2">
                                            <textarea
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                placeholder="Enter secret message here..."
                                                className={`flex-1 bg-surface border text-white rounded-2xl p-4 resize-none focus:outline-none focus:ring-1 transition-colors placeholder-outline min-h-[120px]
                                                ${isOverLimit ? 'border-error focus:border-error focus:ring-error' : 'border-secondary-container focus:border-primary focus:ring-primary'}`}
                                            ></textarea>

                                            <div className="flex items-center gap-3 px-1">
                                                <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-300 ${isOverLimit ? 'bg-error' : 'bg-primary'}`}
                                                        style={{ width: `${usagePercent}%` }}
                                                    ></div>
                                                </div>
                                                <span className={`text-xs font-mono ${isOverLimit ? 'text-error font-bold' : 'text-outline'}`}>
                                                    {currentBytes} / {maxBytes} bytes
                                                </span>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <IconLock className="text-outline" />
                                            </div>
                                            <input 
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Set Password (Optional)"
                                                className="w-full bg-surface border border-secondary-container text-white text-sm rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-outline"
                                            />
                                        </div>

                                        {resultBlobUrl ? (
                                            <div className="animate-slide-up bg-[#2b2930] border border-secondary-container p-4 rounded-2xl flex items-center justify-between">
                                                <div className="flex flex-col justify-center max-w-[70%]">
                                                    <p className="text-white font-bold text-sm mb-0.5 truncate" title={image ? `${image.name.split('.').slice(0, -1).join('.')}_secure.png` : 'dontsee_secure.png'}>
                                                        {image ? `${image.name.split('.').slice(0, -1).join('.')}_secure.png` : 'dontsee_secure.png'}
                                                    </p>
                                                    <p className="text-outline text-xs font-mono">{formatBytes(resultSize)}</p>
                                                </div>
                                                <a
                                                    href={resultBlobUrl}
                                                    download={image ? `${image.name.split('.').slice(0, -1).join('.')}_secure.png` : 'dontsee_secure.png'}
                                                    className="w-12 h-12 bg-primary hover:bg-white text-on-primary rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-lg flex-shrink-0"
                                                    aria-label="Download encoded image"
                                                >
                                                    <IconDownload className="w-6 h-6" />
                                                </a>
                                            </div>
                                        ) : (
                                            <button onClick={() => processEncode(image)} disabled={isProcessing || !message || isOverLimit}
                                                aria-label="Encrypt and conceal message"
                                                className={`py-4 rounded-2xl font-bold text-sm uppercase tracking-wider shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-2 relative overflow-hidden
                                                ${(!message || isOverLimit) ? 'bg-surface-container text-secondary-container border border-secondary-container cursor-not-allowed' : 'bg-primary hover:bg-white text-on-primary shadow-primary/10'}`}>

                                                {isProcessing ? (
                                                    <div className="flex items-center gap-2 z-10 relative">
                                                        <div className="w-5 h-5 border-4 border-on-primary/30 border-t-on-primary rounded-full animate-spin-slow" aria-label="Processing"></div>
                                                        <span>{getButtonLabel()}</span>
                                                    </div>
                                                ) : (
                                                    <><IconEyeOff className="w-5 h-5"/> Conceal</>
                                                )}

                                                {isProcessing && stage === 'processing' && (
                                                    <div className="absolute inset-0 bg-white/20 z-0 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }}></div>
                                                )}
                                                {isProcessing && stage !== 'processing' && (
                                                    <div className="absolute inset-0 bg-white/10 z-0 animate-pulse"></div>
                                                )}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {requiresPassword && (
                                            <div className="relative animate-slide-up">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <IconLock className="text-outline" />
                                                </div>
                                                <input
                                                    type="password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="Enter Password to Unlock"
                                                    className="w-full bg-surface border border-secondary-container text-white text-sm rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-outline"
                                                />
                                            </div>
                                        )}

                                        {decodedMessage && (
                                            <div className="flex-1 bg-surface-container border border-primary/50 rounded-2xl p-6 flex items-center justify-center transition-colors min-h-[120px] animate-slide-up">
                                                <p className="w-full text-left text-primary font-mono text-sm break-words whitespace-pre-wrap">{decodedMessage}</p>
                                            </div>
                                        )}

                                        <button onClick={() => processDecode(image)} disabled={isProcessing || !hasSignature}
                                            className={`py-4 rounded-2xl font-bold text-sm uppercase tracking-wider shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-2 relative overflow-hidden
                                            ${isProcessing || !hasSignature ? 'bg-secondary-container text-outline cursor-not-allowed' : 'bg-secondary-container hover:bg-[#5c566b] text-white shadow-secondary-container/20'}`}>

                                            {isProcessing ? (
                                                <div className="flex items-center gap-2 z-10 relative">
                                                    <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin-slow"></div>
                                                    <span>{getButtonLabel()}</span>
                                                </div>
                                            ) : (
                                                <><IconZap className="w-5 h-5"/> Reveal</>
                                            )}

                                            {isProcessing && stage === 'processing' && (
                                                <div className="absolute inset-0 bg-white/10 z-0 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }}></div>
                                            )}
                                            {isProcessing && stage !== 'processing' && (
                                                <div className="absolute inset-0 bg-white/5 z-0 animate-pulse"></div>
                                            )}
                                        </button>

                                        <div className="w-full text-center mt-4 animate-slide-up">
                                            <button onClick={handleReConceal} className="text-sm text-outline hover:text-primary transition-colors">
                                                Want to use this image again? <strong>Re-Conceal</strong>
                                            </button>
                                        </div>
                                    </>
                                )
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
