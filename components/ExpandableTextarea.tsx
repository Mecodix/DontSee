import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconMaximize, IconMinimize } from './Icons';

interface ExpandableTextareaProps {
    value: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    readOnly?: boolean;
    placeholder?: string;
    renderFooter?: () => React.ReactNode;
    className?: string;
}

export const ExpandableTextarea: React.FC<ExpandableTextareaProps> = ({
    value,
    onChange,
    readOnly,
    placeholder,
    renderFooter,
    className = ''
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Handle Escape key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isExpanded) {
                setIsExpanded(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isExpanded]);

    // Lock body scroll when expanded
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

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    // Common classes for the textarea
    const baseClasses = `w-full h-full bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-white placeholder-outline font-mono text-sm leading-relaxed custom-scrollbar transition-all duration-300`;

    // Keyframes for animation (injected via style)
    const styles = `
        @keyframes zoomInModal {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-zoom-in-modal {
            animation: zoomInModal 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
    `;

    // Expanded Content (Portal)
    // Changed: Centered Modal with Backdrop instead of Full Screen
    const expandedContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-6">
            <style>{styles}</style>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
                onClick={toggleExpand}
                aria-hidden="true"
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-5xl h-[85vh] bg-[#1e1c24] rounded-3xl shadow-2xl border border-white/10 flex flex-col overflow-hidden animate-zoom-in-modal origin-center">
                {/* Header / Controls */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-[#25232b]">
                    <h3 className="text-xl font-bold text-white font-brand flex items-center gap-2">
                        {readOnly ? "Revealed Message" : "Editing Secret"}
                        <span className="text-xs font-mono text-outline px-2 py-0.5 rounded-full bg-white/5">Zen Mode</span>
                    </h3>
                    <button
                        onClick={toggleExpand}
                        className="p-2 text-outline hover:text-primary transition-colors rounded-full hover:bg-white/10 active:scale-95"
                        aria-label="Minimize"
                        title="Minimize (Esc)"
                    >
                        <IconMinimize className="w-6 h-6" />
                    </button>
                </div>

                {/* Text Area Container */}
                <div className="flex-1 relative bg-surface-container/20">
                    <textarea
                        value={value}
                        onChange={onChange}
                        readOnly={readOnly}
                        placeholder={placeholder}
                        className={`${baseClasses} text-lg p-8`}
                        autoFocus
                    />
                </div>

                {/* Footer */}
                {renderFooter && (
                    <div className="px-6 py-3 bg-[#25232b] border-t border-white/5">
                        {renderFooter()}
                    </div>
                )}
            </div>
        </div>
    );

    // Collapsed Content (Standard)
    const collapsedContent = (
        <div className={`relative flex flex-col min-h-[120px] bg-surface border rounded-2xl transition-colors ${className}
            ${readOnly
                ? 'border-primary/50 bg-surface-container'
                : 'border-secondary-container focus-within:border-primary focus-within:ring-1 focus-within:ring-primary'
            }`}>

            {/* Header / Controls - ABSOLUTE POS */}
            <div className="absolute top-2 right-2 z-10">
                <button
                    onClick={toggleExpand}
                    className="p-2 text-outline hover:text-primary transition-colors rounded-full hover:bg-white/5"
                    aria-label="Maximize"
                    title="Maximize (Zen Mode)"
                >
                    <IconMaximize className="w-4 h-4" />
                </button>
            </div>

            {/* Text Area - ADDED PADDING RIGHT to avoid icon overlap */}
            <div className="flex-1 relative min-h-0">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={onChange}
                    readOnly={readOnly}
                    placeholder={placeholder}
                    className={`${baseClasses} p-4 pr-12`}
                />
            </div>

            {/* Footer */}
            {renderFooter && (
                <div className="mt-0 px-2 pb-2">
                    {renderFooter()}
                </div>
            )}
        </div>
    );

    return (
        <>
            {collapsedContent}
            {isExpanded && createPortal(expandedContent, document.body)}
        </>
    );
};
