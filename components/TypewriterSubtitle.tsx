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
    speed = 40,
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
                // Deleting text
                setDisplayedText(prev => prev.substring(0, prev.length - 1));
            } else {
                // Typing text
                setDisplayedText(currentFullText.substring(0, displayedText.length + 1));
            }

            // Determine next state
            if (!isDeleting && displayedText === currentFullText) {
                // Finished typing, pause before deleting
                timer = setTimeout(() => setIsDeleting(true), pause);
            } else if (isDeleting && displayedText === '') {
                // Finished deleting, move to next text
                setIsDeleting(false);
                setCurrentTextIndex((prev) => (prev + 1) % texts.length);
            } else {
                // Continue typing/deleting
                const typingSpeed = isDeleting ? speed / 3 : speed;
                timer = setTimeout(handleTyping, typingSpeed);
            }
        };

        timer = setTimeout(handleTyping, speed);

        return () => clearTimeout(timer);
    }, [displayedText, isDeleting, currentTextIndex, texts, speed, pause]);

    return (
        <div className="h-[1.5em] flex items-center justify-center max-w-sm mx-auto overflow-hidden">
            <Typography variant="body" className="text-gray-400 font-medium tracking-wide relative inline-flex items-center">
                {displayedText}
                <span className={cn(
                    "w-[2px] h-[1.2em] bg-primary ml-1 block",
                    "animate-blink-caret" // We will define this animation in tailwind config or global css
                )}></span>
            </Typography>
        </div>
    );
};
