import React, { useState } from 'react';
import { AppMode } from './types';
import { IconBlinkingEye, IconDownload, IconEyeOff, IconHeart, IconLock, IconZap, IconChevronDown } from './components/Icons';
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
    const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

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
    };

    const toggleMode = (newMode: AppMode) => {
        setMode(newMode);
        reset();
    };

    // Handle Auto-Switch Logic based on Scan
    const onImageLoaded = (img: HTMLImageElement) => {
        handleImageScan(img, mode);

        // We need to wait slightly for the scan result to update state 'hasSignature',
        // but handleImageScan is async and updates state internally.
        // Ideally, we would pass a callback to handleImageScan, or check state.
        // However, handleImageScan in the hook updates 'hasSignature' state.
        // We can't synchronously know the result here.
        // Let's modify handleImageScan in the hook to return a promise or accept a callback?
        // Or simply rely on the user to see the notification.

        // User Request: "Smart Unified Dropzone"
        // Logic: If signature found -> Reveal Mode. Else -> Conceal Mode.
        // Since the scan is async (worker), we need to hook into that flow.

        // NOTE: We can't easily do this purely from App.tsx without modifying the hook to expose a callback.
        // But wait, handleImageScan is inside the hook.
        // Let's assume for now we let the hook do its thing, and we react to 'hasSignature' change?
        // No, 'hasSignature' changes when we load a file.

        // BETTER APPROACH: We will use a useEffect to watch `hasSignature`?
        // No, that might trigger unwanted switches.

        // Let's pass a custom callback to handleImageScan if possible, or just wait.
        // Actually, the hook exposes `handleImageScan`. We can modify the hook to return the result?
        // `scanImage` in service returns a Promise.

        // Let's just rely on the hook's internal notification for now, OR
        // we can implement a `useEffect` that switches mode when `hasSignature` becomes true *immediately after* a file load.
    };

    // To implement "Smart Drop", we need to know when a file was just loaded.
    // Let's use a useEffect on `hasSignature` combined with `image`.
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
        setMode(AppMode.HIDE);
        resetStegoState();
        // We keep the image, but treat it as fresh.
        // Re-calculate capacity just in case
        if (image) {
             // handleImageScan(image.imgObject, AppMode.HIDE);
             // Actually we just want to clear signature state which resetStegoState does.
             // But we might want to recalc maxBytes? resetStegoState clears maxBytes too.
             // We need to recalc capacity.
             try {
                 // Re-importing calculation logic or just calling scan again?
                 // Calling scan again is safest to reset maxBytes
                 handleImageScan(image.imgObject, AppMode.HIDE);
             } catch(e) {}
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
                
                <div className="md:w-1/3 bg-[#2b2930] p-8 flex flex-col border-b md:border-b-0 md:border-r border-secondary-container">
                    <div className="bg-surface-container p-1 rounded-full flex border border-secondary-container relative mb-8">
                        <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-secondary-container rounded-full transition-all duration-300 ease-out ${mode === AppMode.HIDE ? 'left-1' : 'translate-x-full left-1'}`}></div>
                        <button
                            onClick={() => toggleMode(AppMode.HIDE)}
                            className={`flex-1 relative z-10 py-3 rounded-full text-sm font-bold flex justify-center items-center gap-2 transition-colors ${mode === AppMode.HIDE ? 'text-white' : 'text-outline'}`}
                            aria-label="Switch to conceal mode"
                        >
                            <IconEyeOff className="w-4 h-4" /> Conceal
                        </button>
                        <button
                            onClick={() => toggleMode(AppMode.SEE)}
                            className={`flex-1 relative z-10 py-3 rounded-full text-sm font-bold flex justify-center items-center gap-2 transition-colors ${mode === AppMode.SEE ? 'text-white' : 'text-outline'}`}
                            aria-label="Switch to reveal mode"
                        >
                            <IconBlinkingEye className="w-4 h-4" /> Reveal
                        </button>
                    </div>

                    <div className="mt-4">
                        <button 
                            onClick={() => setIsDescriptionOpen(!isDescriptionOpen)}
                            className="flex items-center gap-3 group text-left focus:outline-none w-full"
                            aria-expanded={isDescriptionOpen}
                            aria-label="Toggle description"
                        >
                            <h2 className="text-2xl font-bold text-white font-brand group-hover:text-primary transition-colors">
                                {mode === AppMode.HIDE ? 'Encrypt & Conceal' : 'Decrypt & Reveal'}
                            </h2>
                            <IconChevronDown className={`w-5 h-5 text-outline transition-transform duration-300 ${isDescriptionOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isDescriptionOpen ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                            <div className="overflow-hidden">
                                <p className="text-white/70 text-sm leading-relaxed">
                                    {mode === AppMode.HIDE 
                                        ? "Encrypt your secrets using military-grade AES-GCM and scattered LSB. The message is exploded randomly across pixels using a unique salt, making it resistant to statistical analysis." 
                                        : "Upload a DontSee image. The engine will detect the header signature and reconstruct the scattered data using your password."}
                                </p>
                            </div>
                        </div>
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

                                    {/* Re-Conceal Option */}
                                    <div className="w-full text-center mt-4 animate-slide-up">
                                        <button onClick={handleReConceal} className="text-sm text-outline hover:text-primary underline decoration-dotted transition-colors">
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
