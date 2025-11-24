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
    const [displayedText, setDisplayedText] = useState('');
    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const [phase, setPhase] = useState<'typing' | 'pausing' | 'deleting'>('typing');

    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const currentFullText = texts[currentTextIndex];

        if (phase === 'typing') {
            if (displayedText.length < currentFullText.length) {
                timeout = setTimeout(() => {
                    setDisplayedText(currentFullText.slice(0, displayedText.length + 1));
                }, speed);
            } else {
                // Finished typing, switch to pause
                setPhase('pausing');
            }
        } else if (phase === 'pausing') {
            // Wait for 'pause' duration then switch to deleting
            timeout = setTimeout(() => {
                setPhase('deleting');
            }, pause);
        } else if (phase === 'deleting') {
            if (displayedText.length > 0) {
                timeout = setTimeout(() => {
                    setDisplayedText(prev => prev.slice(0, -1));
                }, speed / 2);
            } else {
                // Finished deleting, switch to next text
                setCurrentTextIndex((prev) => (prev + 1) % texts.length);
                setPhase('typing');
            }
        }

        return () => clearTimeout(timeout);
    }, [displayedText, phase, currentTextIndex, texts, speed, pause]);

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
