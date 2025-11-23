import React, { useState, useEffect } from 'react';
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
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setPortalTarget(document.body);
    }, []);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    // Combine classes safely
    const baseClasses = `bg-surface border text-white rounded-2xl p-4 resize-none focus:outline-none transition-colors placeholder-outline w-full relative group pr-10 ${className}`;

    // We need to handle the maximize icon visibility.
    // The textarea itself should have padding-right to avoid overlapping text with the icon.

    const renderExpanded = () => {
        if (!portalTarget) return null;

        return createPortal(
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="w-full max-w-4xl h-[80vh] bg-surface-container rounded-3xl border border-primary/20 shadow-2xl flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200">
                    {/* Header / Minimize Button */}
                    <div className="absolute top-4 right-4 z-10">
                        <button
                            onClick={toggleExpand}
                            className="p-2 bg-surface-raised hover:bg-secondary-container text-outline hover:text-white rounded-full transition-colors shadow-lg"
                            aria-label="Minimize"
                        >
                            <IconMinimize className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Text Area */}
                    <textarea
                        {...props}
                        autoFocus
                        className={`flex-1 w-full h-full bg-transparent text-white p-8 text-lg resize-none focus:outline-none placeholder-outline/50 font-mono leading-relaxed`}
                        style={{ ...style }}
                    />

                    {/* Footer (Character count, etc) */}
                    {footer && (
                        <div className="p-4 bg-surface border-t border-white/5">
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
            <div className="relative w-full group">
                <textarea
                    {...props}
                    className={`${baseClasses} ${maxHeight || 'min-h-[120px]'}`}
                />
                <button
                    onClick={toggleExpand}
                    className="absolute top-3 right-3 p-1.5 text-outline/50 hover:text-primary bg-transparent hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
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
