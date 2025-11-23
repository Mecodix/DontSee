import React, { useState } from 'react';
import { AppMode, AppImage } from './types';
import { IconFilePlus } from './components/Icons';
import { Toast } from './components/Toast';
import { ImagePreview } from './components/ImagePreview';
import { ConcealView } from './components/ConcealView';
import { RevealView } from './components/RevealView';
import { calculateMaxBytes, getByteLength } from './utils/capacity';
import { useImageHandler } from './hooks/useImageHandler';
import { useSteganography } from './hooks/useSteganography';
import { usePasteHandler } from './hooks/usePasteHandler';
import { useGlobalDragDrop } from './hooks/useGlobalDragDrop';
import { AppShell } from './components/layout/AppShell';
import { Typography } from './components/ui/Typography';
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
            title: "Reading Image",
            desc: "Decoding pixels..."
        };
    }
    if (isScanning) {
        return {
            title: "Analyzing",
            desc: "Checking for hidden text..."
        };
    }
    if (!image) {
        return {
            title: "Steganography",
            desc: "Hide text in images, or reveal secrets."
        };
    }
    if (mode === AppMode.HIDE) {
        return {
            title: "Conceal",
            desc: "Hide your secret text."
        };
    }
    // Reveal Mode
    if (requiresPassword) {
        return {
            title: "Locked",
            desc: "Password required to decrypt."
        };
    }
    return {
        title: "Found Secret",
        desc: "Hidden text detected."
    };
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
        decodedMessage,
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

    // Hook up Global Drag & Drop
    const { isDragging } = useGlobalDragDrop(handleFileDrop);

    // Hook up Paste Handler
    usePasteHandler(
        (file) => {
             // Immediate feedback: Set reading to true
            setIsReading(true);
            resetStegoState();

            processFile(
                file,
                (img) => onImageLoaded(img),
                (msg) => {
                    notify('error', msg || 'Failed to load pasted image');
                    setIsReading(false);
                }
            );
        },
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

    const dragOverlayContent = isDragging ? (
        <div className="fixed inset-0 z-[999] bg-surface/90 backdrop-blur-xl flex flex-col items-center justify-center m-4 rounded-[32px] animate-pulse">
            <div className="bg-primary/20 p-8 rounded-full mb-6 ring-4 ring-primary/10">
                <IconFilePlus className="w-16 h-16 text-primary" />
            </div>
            <Typography variant="h1" className="text-4xl text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50">Drop Image Here</Typography>
            <Typography variant="body" className="text-gray-400 mt-4 text-lg">Release to upload instantly</Typography>
        </div>
    ) : null;

    return (
        <AppShell
            showToast={<Toast notification={notification} />}
            dragOverlay={dragOverlayContent}
        >
            {/* Status Header - Dynamic based on state */}
            <div className="flex flex-col items-center text-center gap-2 mb-2 animate-slide-up" key={headerTitle}>
                <Typography variant="h2" className={cn(
                    "transition-colors duration-300",
                    image ? "text-white" : "text-white/80"
                )}>
                    {headerTitle}
                </Typography>
                <Typography variant="body" className="text-gray-500 max-w-sm mx-auto">
                    {headerDesc}
                </Typography>
            </div>

            <div className="flex-1 flex flex-col gap-8 relative w-full">
                
                <ImagePreview
                    image={image}
                    hasSignature={hasSignature}
                    requiresPassword={requiresPassword}
                    onReset={reset}
                    onFileSelect={handleFileSelect}
                    onFileDrop={handleFileDrop}
                    isLoading={isReading || isScanning}
                />

                {/* Content Area - Slides up when image is present */}
                {(image || isScanning || isReading) && (
                    <div className="flex-1 flex flex-col gap-5 animate-enter">

                        {(isScanning || isReading) ? (
                            <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[200px] gap-4 bg-surface-raised/30 rounded-[24px] border border-white/5 backdrop-blur-sm">
                                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                <div className="flex flex-col items-center">
                                    <Typography variant="label" className="text-primary mb-1">
                                        {isReading ? "Reading Bits" : "Analyzing Noise"}
                                    </Typography>
                                    <Typography variant="caption" className="text-gray-500">
                                        Please wait...
                                    </Typography>
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
        </AppShell>
    );
};

export default App;
