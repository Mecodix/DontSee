import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconMaximize, IconMinimize } from './Icons';
import { cn } from '../utils/cn';

interface ExpandableTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    footer?: React.ReactNode;
    maxHeight?: string; // e.g. "max-h-40"
    label?: string; // "Decoded Text", "Secret Message", etc.
}

export const ExpandableTextarea: React.FC<ExpandableTextareaProps> = ({
    className = '',
    footer,
    maxHeight,
    style,
    label,
    readOnly,
    value,
    ...props
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const [animateState, setAnimateState] = useState<'closed' | 'opening' | 'open' | 'closing'>('closed');

    useEffect(() => {
        setPortalTarget(document.body);
    }, []);

    useEffect(() => {
        if (isExpanded) {
            setAnimateState('opening');
            requestAnimationFrame(() => setAnimateState('open'));
            document.body.style.overflow = 'hidden'; // Prevent background scroll
        } else {
            if (animateState === 'open') {
                setAnimateState('closing');
                const t = setTimeout(() => setAnimateState('closed'), 200);
                document.body.style.overflow = '';
                return () => clearTimeout(t);
            }
        }
    }, [isExpanded]);

    const handleToggle = () => {
        setIsExpanded(!isExpanded);
    };

    // --- Minimized View Styles ---
    // If readOnly (Reveal View), we replicate the <fieldset> look for consistency
    // If editable (Conceal View), we use the standard input look

    // Actually, to support the <legend> look properly in minimized mode,
    // if `readOnly` is true, we render the <fieldset> structure.
    // If not, we render the standard <textarea>.
    // Both will have the "maximize" button.

    const renderMinimized = () => {
        if (readOnly && label) {
             return (
                <div className="relative group w-full">
                    <fieldset className={cn(
                        "border border-white/10 rounded-2xl p-5 pt-2 flex flex-col shadow-inner transition-all duration-300 bg-white/5",
                        maxHeight || "min-h-[120px]",
                        className
                    )}>
                        <legend className="px-2 text-[10px] font-bold text-primary/80 uppercase tracking-widest border border-white/5 rounded-full shadow-sm mx-4 bg-transparent select-none">
                            {label}
                        </legend>
                         <div className="flex-1 w-full overflow-y-auto pr-2 custom-scrollbar text-white/90 font-sans text-base leading-relaxed break-words whitespace-pre-wrap mt-2">
                            {value || props.placeholder}
                         </div>
                    </fieldset>
                    <button
                        onClick={handleToggle}
                        className="absolute top-3 right-3 p-2 text-outline/50 hover:text-primary bg-surface/80 backdrop-blur hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                        aria-label="Maximize"
                        title="Maximize (Zen Mode)"
                    >
                        <IconMaximize className="w-4 h-4" />
                    </button>
                </div>
             );
        }

        // Standard Editable Mode
        return (
             <div className="relative w-full group">
                <textarea
                    {...props}
                    value={value}
                    readOnly={readOnly}
                    className={cn(
                        "bg-white/5 border border-white/10 text-white text-base rounded-2xl p-4 pr-12 resize-none focus:outline-none transition-all duration-300 placeholder:text-gray-600 focus:border-white/30 focus:shadow-none w-full",
                         maxHeight || 'min-h-[120px]',
                         className
                    )}
                />
                <button
                    onClick={handleToggle}
                    className="absolute top-3 right-3 p-2 text-outline/50 hover:text-primary bg-transparent hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label="Maximize"
                    title="Maximize (Zen Mode)"
                >
                    <IconMaximize className="w-4 h-4" />
                </button>
            </div>
        );
    };

    const renderExpanded = () => {
        if (!portalTarget || animateState === 'closed') return null;

        const isOpen = animateState === 'open';

        return createPortal(
            <div className={cn(
                "fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6",
                "transition-all duration-300 ease-out",
                isOpen ? "bg-black/80 backdrop-blur-md" : "bg-black/0 backdrop-blur-none pointer-events-none"
            )}>
                <div className={cn(
                    "w-full max-w-5xl h-[85vh] bg-[#0A0A0A] rounded-[32px] border border-white/10 shadow-2xl flex flex-col overflow-hidden relative",
                    "transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)", // Apple-like easing
                    isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-8"
                )}>
                    {/* Header Bar */}
                    <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 shrink-0 bg-white/[0.02]">
                         <div className="flex items-center gap-3">
                            {label && (
                                <span className="text-xs font-bold text-primary/80 uppercase tracking-widest border border-white/10 px-3 py-1 rounded-full">
                                    {label || "Editor"}
                                </span>
                            )}
                            {readOnly && (
                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                                    Read Only
                                </span>
                            )}
                         </div>

                         <button
                            onClick={handleToggle}
                            className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-colors group"
                            aria-label="Minimize"
                        >
                            <IconMinimize className="w-5 h-5 transition-transform group-hover:scale-90" />
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 relative">
                        <textarea
                            {...props}
                            value={value}
                            readOnly={readOnly}
                            autoFocus={!readOnly}
                            placeholder={props.placeholder}
                            className={cn(
                                "w-full h-full bg-transparent text-white/90 p-8 md:p-12 text-lg md:text-xl resize-none focus:outline-none placeholder:text-gray-700 font-sans leading-loose custom-scrollbar",
                                "selection:bg-primary/30 selection:text-white"
                            )}
                            style={{ ...style }}
                        />
                    </div>

                    {/* Footer */}
                    {footer && (
                        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] text-sm text-gray-500">
                            {footer}
                        </div>
                    )}
                </div>
            </div>,
            portalTarget
        );
    };

    return (
        <>
            {renderMinimized()}
            {renderExpanded()}
        </>
    );
};
