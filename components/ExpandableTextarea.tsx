import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconMaximize, IconMinimize } from './Icons';

interface ExpandableTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    footer?: React.ReactNode;
    maxHeight?: string; // For the non-expanded view, e.g., "max-h-40" or "h-40"
}

export const ExpandableTextarea: React.FC<ExpandableTextareaProps> = ({
    className = '',
    footer,
    maxHeight,
    style,
    ...props
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    // Refs for handling animations safely
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setPortalTarget(document.body);
        return () => {
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (isExpanded) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isExpanded]);

    const open = () => {
        setIsExpanded(true);
        setIsClosing(false);
    };

    const close = () => {
        setIsClosing(true);
        // Wait for animation to finish (300ms)
        closeTimeoutRef.current = setTimeout(() => {
            setIsExpanded(false);
            setIsClosing(false);
        }, 280);
    };

    // Combine classes safely for the base inputs
    const baseClasses = `bg-surface border text-white rounded-2xl p-4 resize-none focus:outline-none transition-colors placeholder-outline w-full relative group pr-10 ${className}`;

    const renderExpanded = () => {
        if (!portalTarget) return null;

        // Animation classes
        // We manually define keyframes via inline styles or rely on Tailwind's transition utilities combined with state
        // But since we need unmount-after-animation, we use the isClosing state.

        const overlayClass = isClosing
            ? 'animate-out fade-out duration-300'
            : 'animate-in fade-in duration-300';

        const modalClass = isClosing
            ? 'animate-out zoom-out-95 duration-300'
            : 'animate-in zoom-in-95 duration-300';

        return createPortal(
            <div className={`fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 ${overlayClass}`} role="dialog" aria-modal="true">
                <div className={`w-full max-w-5xl h-[85vh] bg-surface-container rounded-[32px] border border-primary/20 shadow-2xl flex flex-col overflow-hidden relative ${modalClass}`}>

                    {/* Header / Minimize Button */}
                    <div className="absolute top-6 right-6 z-10">
                        <button
                            onClick={close}
                            className="p-3 bg-surface-raised hover:bg-secondary-container text-outline hover:text-white rounded-full transition-all duration-200 shadow-lg hover:scale-105 active:scale-95"
                            aria-label="Minimize"
                        >
                            <IconMinimize className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Text Area */}
                    <div className="flex-1 relative overflow-hidden">
                        <textarea
                            {...props}
                            autoFocus={!isClosing}
                            className={`w-full h-full bg-transparent text-white p-8 md:p-12 text-lg md:text-xl resize-none focus:outline-none placeholder-outline/40 font-sans font-medium leading-relaxed tracking-wide overflow-y-auto custom-scrollbar`}
                            style={{ ...style }}
                            spellCheck={false}
                        />
                    </div>

                    {/* Footer (Character count, etc) */}
                    {footer && (
                        <div className="p-6 bg-surface/50 backdrop-blur border-t border-white/5">
                            {footer}
                        </div>
                    )}
                </div>

                {/* Inline styles for custom scrollbar in Zen Mode */}
                <style>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 5px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(255, 255, 255, 0.2);
                    }
                `}</style>
            </div>,
            portalTarget
        );
    };

    return (
        <>
            <div className="relative w-full group">
                <textarea
                    {...props}
                    className={`${baseClasses} ${maxHeight || 'min-h-[120px]'}`}
                />
                <button
                    onClick={open}
                    className="absolute top-3 right-3 p-2 text-outline/50 hover:text-primary bg-transparent hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label="Maximize"
                    title="Maximize (Zen Mode)"
                >
                    <IconMaximize className="w-4 h-4" />
                </button>
            </div>
            {isExpanded && renderExpanded()}
        </>
    );
};
