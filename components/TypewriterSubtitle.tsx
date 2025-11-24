import React, { useState, useEffect } from 'react';
import { Typography } from './ui/Typography';

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
                const typingSpeed = isDeleting ? speed / 2 : speed;
                timer = setTimeout(handleTyping, typingSpeed);
            }
        };

        timer = setTimeout(handleTyping, speed);

        return () => clearTimeout(timer);
    }, [displayedText, isDeleting, currentTextIndex, texts, speed, pause]);

    return (
        <Typography variant="body" className="text-gray-500 max-w-sm mx-auto h-[1.5em] flex items-center justify-center">
            {displayedText}
            <span className="animate-pulse ml-1 text-primary">|</span>
        </Typography>
    );
};
