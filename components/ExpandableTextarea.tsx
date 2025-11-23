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
    const baseClasses = `w-full h-full bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-white placeholder-outline p-4 font-mono text-sm leading-relaxed custom-scrollbar transition-all duration-300`;

    // Expanded Content (Portal)
    const expandedContent = (
        <div className="fixed inset-0 z-[9999] bg-surface/95 backdrop-blur-xl flex flex-col p-6 animate-fade-in w-screen h-screen">
            <div className="max-w-5xl w-full mx-auto flex flex-col h-full">
                {/* Header / Controls */}
                <div className="flex justify-between items-center px-2 pt-2 pb-4 border-b border-white/10 mb-4">
                    <h3 className="text-2xl font-bold text-white font-brand ml-2">
                        {readOnly ? "Revealed Message" : "Editing Secret"}
                    </h3>
                    <button
                        onClick={toggleExpand}
                        className="p-3 text-outline hover:text-primary transition-colors rounded-full hover:bg-white/10"
                        aria-label="Minimize"
                        title="Minimize (Esc)"
                    >
                        <IconMinimize className="w-8 h-8" />
                    </button>
                </div>

                {/* Text Area */}
                <div className="flex-1 relative min-h-0 bg-surface-container/50 rounded-2xl border border-white/10 overflow-hidden">
                    <textarea
                        value={value}
                        onChange={onChange}
                        readOnly={readOnly}
                        placeholder={placeholder}
                        className={`${baseClasses} text-lg md:text-xl p-8`}
                        autoFocus
                    />
                </div>

                {/* Footer */}
                {renderFooter && (
                    <div className="mt-4 px-2 pb-2 w-full">
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

            {/* Header / Controls */}
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

            {/* Text Area */}
            <div className="flex-1 relative min-h-0">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={onChange}
                    readOnly={readOnly}
                    placeholder={placeholder}
                    className={baseClasses}
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
