import React, { useState, useEffect, useRef } from 'react';
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

    // Wrapper styles
    const wrapperClasses = isExpanded
        ? "fixed inset-0 z-[2000] bg-surface/95 backdrop-blur-xl flex flex-col p-6 animate-fade-in"
        : `relative flex flex-col min-h-[120px] bg-surface border rounded-2xl transition-colors ${className}`;

    const containerBorderClasses = !isExpanded
        ? (readOnly
            ? 'border-primary/50 bg-surface-container'
            : 'border-secondary-container focus-within:border-primary focus-within:ring-1 focus-within:ring-primary')
        : '';

    return (
        <div className={`${wrapperClasses} ${containerBorderClasses}`}>
            {/* Header / Controls */}
            <div className="flex justify-between items-center px-2 pt-2 pb-0">
                {isExpanded && (
                    <h3 className="text-lg font-bold text-white font-brand ml-2">
                        {readOnly ? "Revealed Message" : "Editing Secret"}
                    </h3>
                )}
                <div className="flex-1"></div> {/* Spacer */}
                <button
                    onClick={toggleExpand}
                    className="p-2 text-outline hover:text-primary transition-colors rounded-full hover:bg-white/5"
                    aria-label={isExpanded ? "Minimize" : "Maximize"}
                    title={isExpanded ? "Minimize (Esc)" : "Maximize (Zen Mode)"}
                >
                    {isExpanded ? <IconMinimize className="w-5 h-5" /> : <IconMaximize className="w-4 h-4" />}
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
                    className={`${baseClasses} ${isExpanded ? 'text-base md:text-lg' : ''}`}
                    autoFocus={isExpanded && !readOnly}
                />
            </div>

            {/* Footer */}
            {renderFooter && (
                <div className={`mt-2 px-2 pb-2 ${isExpanded ? 'max-w-3xl w-full mx-auto' : ''}`}>
                    {renderFooter()}
                </div>
            )}
        </div>
    );
};
