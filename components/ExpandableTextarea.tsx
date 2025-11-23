import React, { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { IconMaximize, IconMinimize } from './Icons';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

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
    placeholder,
    onChange,
    ...props
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const uniqueId = useId();

    // Refs for focus management
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
                toggleExpand();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isExpanded]);

    const toggleExpand = () => {
        if (!isExpanded) {
            // Opening: Capture selection
            const start = textareaRef.current?.selectionStart;
            const end = textareaRef.current?.selectionEnd;

            setIsExpanded(true);

            setTimeout(() => {
                if (expandedTextareaRef.current && start !== undefined && end !== undefined) {
                    expandedTextareaRef.current.focus();
                    expandedTextareaRef.current.setSelectionRange(start, end);
                }
            }, 100);
        } else {
            // Closing: Capture selection
            const start = expandedTextareaRef.current?.selectionStart;
            const end = expandedTextareaRef.current?.selectionEnd;

            setIsExpanded(false);

            setTimeout(() => {
                if (textareaRef.current && start !== undefined && end !== undefined) {
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(start, end);
                }
            }, 100);
        }
    };

    return (
        <>
            {/*
              Main layout container.
              We split the styles: layout/positioning stays here, while the visual "Box" morphs.
            */}
            <div className={cn("relative w-full group h-auto isolate", maxHeight || 'min-h-[120px]')}>

                {/*
                    The visible "Box" that morphs.
                    When not expanded, this renders in place.
                    When expanded, we hide it (visually) but keep it in the DOM to reserve space.
                    Actually, for shared element transition to work with Portal, we need BOTH present but only one visible?
                    Framer Motion is tricky with Portals. The best way is to have the element present in the tree
                    and use layoutId to swap. But since one is in a Portal, React sees them as separate trees.
                    Framer Motion handles this if the layoutId matches.
                */}
                <motion.div
                    layoutId={`container-${uniqueId}`}
                    className={cn(
                        "relative w-full h-full rounded-2xl overflow-hidden",
                        // Base styles for the box look (bg, border) come from here OR the parent className
                        // We need to merge them carefully.
                        // The 'className' prop likely contains 'bg-surface border ...'
                        // So we apply 'className' here to the CONTAINER, not the textarea.
                        className,
                        readOnly ? "cursor-default" : "cursor-text",
                        // When expanded, we make this invisible so the Portal one takes over visually,
                        // but we keep layout space.
                        isExpanded ? "opacity-0 pointer-events-none" : "opacity-100"
                    )}
                    style={{
                        zIndex: isExpanded ? 0 : 1,
                        // Ensure we have a background if not provided
                        backgroundColor: !className?.includes('bg-') ? 'rgb(var(--color-surface))' : undefined
                    }}
                >
                    <motion.textarea
                        layoutId={`textarea-${uniqueId}`}
                        {...props}
                        ref={textareaRef}
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        readOnly={readOnly}
                        className={cn(
                            "w-full h-full p-4 pr-10 resize-none transition-colors placeholder-outline focus:outline-none bg-transparent text-white block",
                            // We remove height classes here because the container handles it
                        )}
                        style={style}
                    />

                    {/* Minimize/Maximize Button */}
                     {!isExpanded && (
                         <motion.button
                            layoutId={`button-${uniqueId}`}
                            onClick={toggleExpand}
                            type="button"
                            className={cn(
                                "absolute top-3 right-3 p-1.5 rounded-lg transition-all focus:opacity-100 focus:ring-2 focus:ring-primary/50 outline-none z-10",
                                "text-outline/50 hover:text-primary bg-transparent hover:bg-white/5",
                                "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                            )}
                            aria-label={readOnly ? "View Fullscreen" : "Maximize (Zen Mode)"}
                        >
                            <IconMaximize className="w-4 h-4" />
                        </motion.button>
                     )}
                </motion.div>
            </div>

            {/* Portal for Expanded View */}
            {portalTarget && createPortal(
                <AnimatePresence>
                    {isExpanded && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                            {/* Backdrop */}
                            <motion.div
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={toggleExpand}
                            />

                            {/* Expanded Container */}
                            <motion.div
                                layoutId={`container-${uniqueId}`}
                                className="w-full max-w-4xl h-[80vh] bg-surface-container rounded-[32px] border border-primary/20 shadow-2xl flex flex-col overflow-hidden relative z-10"
                                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                            >
                                {/* Header / Minimize Button */}
                                <div className="absolute top-4 right-4 z-20">
                                    <motion.button
                                        layoutId={`button-${uniqueId}`}
                                        onClick={toggleExpand}
                                        className="p-2 bg-surface-raised hover:bg-secondary-container text-outline hover:text-white rounded-full transition-colors shadow-lg group"
                                        aria-label="Minimize"
                                    >
                                        <IconMinimize className="w-5 h-5" />
                                    </motion.button>
                                </div>

                                {/* Expanded Text Area */}
                                <motion.textarea
                                    layoutId={`textarea-${uniqueId}`}
                                    {...props}
                                    ref={expandedTextareaRef}
                                    value={value}
                                    onChange={onChange}
                                    placeholder={placeholder}
                                    readOnly={readOnly}
                                    className="flex-1 w-full h-full bg-transparent text-white p-8 text-lg resize-none focus:outline-none placeholder-outline/50 font-mono leading-relaxed scrollbar-thin scrollbar-thumb-secondary-container scrollbar-track-transparent"
                                />

                                {/* Footer */}
                                {footer && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="p-4 bg-surface border-t border-white/5"
                                    >
                                        {footer}
                                    </motion.div>
                                )}
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                portalTarget
            )}
        </>
    );
};
