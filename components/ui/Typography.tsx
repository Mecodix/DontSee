import React from 'react';
import { cn } from '../../utils/cn';

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
    variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
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
        'p'
    );

    const styles = {
        h1: "text-4xl md:text-5xl font-bold font-brand text-white tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent",
        h2: "text-2xl md:text-3xl font-bold font-brand text-white tracking-tight",
        h3: "text-xl font-semibold font-brand text-white/90",
        body: "text-base text-gray-400 leading-relaxed font-sans",
        caption: "text-xs font-medium text-gray-500 uppercase tracking-widest",
        label: "text-sm font-medium font-brand text-gray-300"
    };

    return (
        <Component className={cn(styles[variant], className)} {...props}>
            {children}
        </Component>
    );
};
