import React, { useState, useEffect } from 'react';
import { Typography } from './ui/Typography';
import { cn } from '../utils/cn';

interface TypewriterSubtitleProps {
    texts: string[];
    speed?: number;
    pause?: number;
}

export const TypewriterSubtitle: React.FC<TypewriterSubtitleProps> = ({
    texts,
    speed = 50,
    pause = 2000
}) => {
    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;

        const handleTyping = () => {
            const currentFullText = texts[currentTextIndex];

            if (isDeleting) {
                // Deleting Phase: Reduce text length
                setDisplayedText(prev => {
                    if (prev.length === 0) return '';
                    return prev.substring(0, prev.length - 1);
                });
            } else {
                // Typing Phase: Increase text length
                setDisplayedText(prev => {
                    if (prev.length === currentFullText.length) return prev;
                    return currentFullText.substring(0, prev.length + 1);
                });
            }
        };

        // Determine delay and next action *before* scheduling
        let delay = speed;

        if (isDeleting) {
            delay = speed / 2; // Delete faster
            if (displayedText === '') {
                // Finished deleting, switch to next text
                setIsDeleting(false);
                setCurrentTextIndex((prev) => (prev + 1) % texts.length);
                delay = 500; // Pause briefly before typing next
            }
        } else {
            // Typing
            if (displayedText === texts[currentTextIndex]) {
                 // Finished typing
                 delay = pause; // Long pause before deleting
                 if (!isDeleting) {
                     // Only schedule delete if we aren't already deleting (prevent double triggers)
                     timer = setTimeout(() => setIsDeleting(true), pause);
                     return () => clearTimeout(timer);
                 }
            }
        }

        timer = setTimeout(handleTyping, delay);
        return () => clearTimeout(timer);

    }, [displayedText, isDeleting, currentTextIndex, texts, speed, pause]);

    return (
        <div className="h-[1.5em] flex items-center justify-center max-w-sm mx-auto overflow-hidden">
            <Typography variant="body" className="text-gray-400 font-medium tracking-wide relative inline-flex items-center">
                {displayedText}
                <span className={cn(
                    "w-[2px] h-[1.2em] bg-primary ml-1 block",
                    "animate-blink-caret"
                )}></span>
            </Typography>
        </div>
    );
};
