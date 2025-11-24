import React from 'react';
import { cn } from '../../utils/cn';

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
    variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label' | 'mono';
    as?: React.ElementType;
}

export const Typography: React.FC<TypographyProps> = ({
    variant = 'body',
    as,
    className,
    children,
    ...props
}) => {
    const Component = as || (
        variant === 'h1' ? 'h1' :
        variant === 'h2' ? 'h2' :
        variant === 'h3' ? 'h3' :
        variant === 'caption' ? 'span' :
        variant === 'label' ? 'label' :
        'p'
    );

    const styles = {
        // Space Grotesk - Tight Tracking - High Contrast
        h1: "font-display text-4xl md:text-5xl font-bold tracking-tighter text-white",
        h2: "font-display text-2xl md:text-3xl font-bold tracking-tight text-white",
        h3: "font-display text-xl font-bold tracking-tight text-white/90",

        // DM Sans - Readable
        body: "font-sans text-base text-gray-400 leading-relaxed font-medium",

        // Technical/Microcopy
        caption: "font-sans text-xs font-semibold text-gray-500 uppercase tracking-widest",
        label: "font-display text-sm font-bold text-gray-300 tracking-wide",
        mono: "font-mono text-sm text-gray-400"
    };

    return (
        <Component className={cn(styles[variant], className)} {...props}>
            {children}
        </Component>
    );
};
