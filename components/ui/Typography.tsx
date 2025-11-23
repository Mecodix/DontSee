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
        h1: "text-3xl font-bold font-brand text-white",
        h2: "text-2xl font-bold font-brand text-white",
        h3: "text-xl font-bold font-brand text-white",
        body: "text-base text-white/70 leading-relaxed font-sans",
        caption: "text-xs font-mono text-outline",
        label: "text-sm font-medium font-brand text-outline"
    };

    return (
        <Component className={cn(styles[variant], className)} {...props}>
            {children}
        </Component>
    );
};
