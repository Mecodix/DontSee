import React, { useState } from 'react';
import { AppMode } from './types';
import { IconBlinkingEye, IconDownload, IconEyeOff, IconHeart, IconLock, IconZap } from './components/Icons';
import { Toast } from './components/Toast';
import { ImagePreview } from './components/ImagePreview';
import { getByteLength } from './utils/capacity';
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
    };

    // Handle Auto-Switch Logic based on Scan
    const onImageLoaded = (img: HTMLImageElement) => {
        handleImageScan(img, mode);
    };

    // "Smart Drop" Logic: Auto-switch when signature state is determined
    React.useEffect(() => {
        if (image && hasSignature) {
            setMode(AppMode.SEE);
        } else if (image && !hasSignature) {
            setMode(AppMode.HIDE);
        }
    }, [hasSignature, image]);


    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            resetStegoState();
            processFile(
                file,
                (img) => onImageLoaded(img),
                (msg) => notify('error', msg || 'Failed to load image')
            );
        }
        e.target.value = '';
    };

    const handleFileDrop = (file: File) => {
        resetStegoState();
        processFile(
            file,
            (img) => onImageLoaded(img),
            (msg) => notify('error', msg || 'Failed to load image')
        );
    };

    const handleReConceal = () => {
        // Manually switch mode and clear signature state without re-scanning immediately
        setMode(AppMode.HIDE);
        resetStegoState();
        // We do NOT call handleImageScan here to avoid the loop.
        // The user is now in "Conceal" mode with the same image, treated as raw.
        // Capacity will be 0 until we recalc?
        // Actually, we need capacity for the progress bar.
        // We can manually calc capacity without checking signature:
        if (image) {
            // We can trigger a lightweight capacity calc or just let the user type.
            // If we want capacity, we have to run the scan or expose a calc-only method.
            // For now, re-running scan is the only way to get maxBytes via hook.
            // To avoid the loop, we need the hook to NOT update hasSignature if we tell it not to?
            // OR simpler: we just accept that for this session, hasSignature is cleared.
            // We will call handleImageScan but we need to suppress the effect?
            // The Effect depends on [hasSignature, image].
            // If we resetStegoState(), hasSignature becomes false.
            // Effect sees !hasSignature && image -> sets mode to HIDE.
            // This is exactly what we want!

            // So:
            // 1. resetStegoState() -> hasSignature = false
            // 2. Effect fires -> sets mode = HIDE
            // 3. We need to calc capacity.
            // We call handleImageScan. It runs async.
            // It finds signature -> sets hasSignature = true.
            // Effect fires -> sets mode = SEE. Loop!

            // FIX: We need a way to ignore the signature result if we are in "Forced Conceal" mode.
            // But 'mode' is state.
            // Maybe we check if mode is ALREADY HIDE before switching to SEE?
            // No, initial load starts at HIDE.

            // Let's just NOT calculate capacity via handleImageScan?
            // But then maxBytes is 0.

            // Alternative: The worker scan returns the signature. We can ignore it in the hook?
            // We can't change the hook easily without breaking other flows.

            // HACK/FIX: In the Effect, we only switch to SEE if we are currently in HIDE *and* it's a fresh load?
            // That's hard to track.

            // REAL FIX: We need to calculate capacity without scanning for signature.
            // The hook couples them.
            // Let's just set maxBytes manually here? We have the util function!
            try {
                // Import logic dynamically or assume it's available?
                // It's imported at top of file! 'calculateMaxBytes' is not exported from hook, but from utils!
                // Ah, I need to import it in App.tsx. I did!
                // So I can just setMaxBytes?
                // The hook doesn't expose setMaxBytes.

                // Okay, simpler: Just re-scan. If user wants to overwrite, they are essentially saying "Ignore the signature".
                // But the code detects it.
                // Let's just allow the loop? No.

                // Let's modify the Effect to NOT switch if we just clicked Re-Conceal?
                // We can add a ref `isReConcealing`.
            } catch(e){}
        }
        // Note: For this iteration, we will rely on the fact that if we don't scan, maxBytes is 0.
        // This disables the input. That's bad.

        // I will re-trigger scan but I will rely on the fact that I'm removing the Tabs means
        // the Effect is the ONLY way to switch.
        // If I want to stay in HIDE, I must ensure the effect doesn't fire or doesn't switch.
        // I can add a state `ignoreSignature`?

        // Since I cannot change the hook logic in this step easily (risk),
        // I will simply NOT call scan, but I DO need capacity.
        // I will add `setMaxBytes` to the return of `useSteganography` in the hook in a future step?
        // Or I can just use the "Unified" UI as is.

        // Wait, if I re-conceal, I am technically creating a NEW image.
        // The current image has a signature.
        // If I overwrite it, the new image will be valid.
        // The issue is purely UI state.

        // Let's just reload the image as if it was new, but use a flag?
        // Actually, if I modify the hook to export `setMaxBytes`, I can just call it directly.
        // But I can't modify hook in this step (only App.tsx).

        // I will let the loop exist for now? No, user complained.
        // I will simply NOT call scan. MaxBytes will be 0. Input disabled.
        // That is broken.

        // Okay, I'll trigger the scan, but I'll verify if I can prevent the switch.
        // I will add a ref to App.tsx: `skipNextAutoSwitch`.

        handleImageScan(image!.imgObject, AppMode.HIDE);
        // The effect will trigger.
    };

    // Attempting to fix loop with Ref:
    const skipAutoSwitch = React.useRef(false);

    const safeHandleReConceal = () => {
        skipAutoSwitch.current = true;
        setMode(AppMode.HIDE);
        resetStegoState();
        if (image) {
            handleImageScan(image.imgObject, AppMode.HIDE);
        }
        // After scan (async), hasSignature becomes true.
        // Effect fires.
    };

    React.useEffect(() => {
        if (skipAutoSwitch.current) {
            // Reset flag and do nothing?
            // We want to ignore the switch to SEE.
            if (hasSignature) {
                 skipAutoSwitch.current = false;
                 return;
            }
        }

        if (image && hasSignature) {
            setMode(AppMode.SEE);
        } else if (image && !hasSignature) {
            setMode(AppMode.HIDE);
        }
    }, [hasSignature, image]);


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
        : (mode === AppMode.HIDE ? "Conceal Text" : "Reveal Secret");

    const headerDesc = !image
        ? "Upload a DontSee image to decrypt, or any image to hide a new message."
        : (mode === AppMode.HIDE
            ? "Encrypt your secrets using military-grade AES-GCM (Argon2id) and scattered LSB."
            : "Locked message detected. Enter password to reconstruct the scattered data.");

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
                        <h2 className="text-3xl font-bold text-white font-brand transition-all duration-300">
                            {headerTitle}
                        </h2>
                        <p className="text-white/70 text-sm leading-relaxed">
                            {headerDesc}
                        </p>
                    </div>
                </div>

                <div className="flex-1 p-8 flex flex-col relative">
                    
                    <ImagePreview 
                        image={image} 
                        hasSignature={hasSignature} 
                        onReset={reset} 
                        onFileSelect={handleFileSelect} 
                        onFileDrop={handleFileDrop}
                    />

                    {image && (
                        <div className="flex-1 flex flex-col gap-5 animate-slide-up mt-8">
                            
                            {mode === AppMode.HIDE ? (
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
                                        <button onClick={safeHandleReConceal} className="text-sm text-outline hover:text-primary underline decoration-dotted transition-colors">
                                            Want to use this image again? <strong>Re-Conceal</strong>
                                        </button>
                                    </div>
                                </>
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
