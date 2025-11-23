import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconMaximize, IconMinimize } from './Icons';
import { cn } from '../utils/cn';
import { Button } from './ui/Button';

interface ExpandableTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    footer?: React.ReactNode;
    maxHeight?: string; // For the non-expanded view
}

export const ExpandableTextarea: React.FC<ExpandableTextareaProps> = ({
    className,
    footer,
    maxHeight,
    style,
    readOnly,
    value,
    ...props
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const expandedTextareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setPortalTarget(document.body);
    }, []);

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

    // Handle Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isExpanded) {
                setIsExpanded(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isExpanded]);

    // Sync selection/cursor position when opening/closing
    const toggleExpand = () => {
        if (!isExpanded) {
            // Opening: Capture current selection from small textarea
            const start = textareaRef.current?.selectionStart;
            const end = textareaRef.current?.selectionEnd;

            setIsExpanded(true);

            // Defer setting selection on the new input until after render
            setTimeout(() => {
                if (expandedTextareaRef.current && start !== undefined && end !== undefined) {
                    expandedTextareaRef.current.focus();
                    expandedTextareaRef.current.setSelectionRange(start, end);
                }
            }, 0);
        } else {
            // Closing: Capture selection from expanded textarea
            const start = expandedTextareaRef.current?.selectionStart;
            const end = expandedTextareaRef.current?.selectionEnd;

            setIsExpanded(false);

            setTimeout(() => {
                if (textareaRef.current && start !== undefined && end !== undefined) {
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(start, end);
                }
            }, 0);
        }
    };

    const renderExpanded = () => {
        if (!portalTarget) return null;

        return createPortal(
            <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="w-full max-w-4xl h-[80vh] bg-surface-container rounded-[32px] border border-primary/20 shadow-2xl flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200">
                    {/* Header / Minimize Button */}
                    <div className="absolute top-4 right-4 z-10">
                        <button
                            onClick={toggleExpand}
                            className="p-2 bg-surface-raised hover:bg-secondary-container text-outline hover:text-white rounded-full transition-colors shadow-lg group"
                            aria-label="Minimize"
                        >
                            <IconMinimize className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Text Area */}
                    <textarea
                        {...props}
                        ref={expandedTextareaRef}
                        value={value}
                        readOnly={readOnly}
                        className="flex-1 w-full h-full bg-transparent text-white p-8 text-lg resize-none focus:outline-none placeholder-outline/50 font-mono leading-relaxed scrollbar-thin scrollbar-thumb-secondary-container scrollbar-track-transparent"
                    />

                    {/* Footer */}
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
                    ref={textareaRef}
                    value={value}
                    readOnly={readOnly}
                    className={cn(
                        "w-full p-4 pr-10 rounded-2xl resize-none transition-colors placeholder-outline focus:outline-none",
                         // Base styles that might be overridden by incoming className (like borders)
                        "bg-surface text-white border",
                        readOnly ? "cursor-default" : "cursor-text",
                        maxHeight || 'min-h-[120px]',
                        className // Allow incoming classes to override
                    )}
                    style={style}
                />

                {/* Maximize Button: Always visible on touch, or on hover/focus for desktop */}
                <button
                    onClick={toggleExpand}
                    type="button"
                    className={cn(
                        "absolute top-3 right-3 p-1.5 rounded-lg transition-all focus:opacity-100 focus:ring-2 focus:ring-primary/50 outline-none",
                        "text-outline/50 hover:text-primary bg-transparent hover:bg-white/5",
                        "opacity-100 md:opacity-0 md:group-hover:opacity-100" // Visible on mobile, hover on desktop
                    )}
                    aria-label={readOnly ? "View Fullscreen" : "Maximize (Zen Mode)"}
                    title={readOnly ? "View Fullscreen" : "Maximize (Zen Mode)"}
                >
                    <IconMaximize className="w-4 h-4" />
                </button>
            </div>
            {isExpanded && renderExpanded()}
        </>
    );
};
