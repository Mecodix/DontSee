import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'raised' | 'glass' | 'neo';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'default', children, ...props }, ref) => {
        const variants = {
            // Standard Bento Block
            default: "bg-surface/60 border border-white/5 backdrop-blur-md",

            // Raised/Hoverable Block
            raised: "bg-surface-raised/40 border border-white/10 hover:border-white/20 hover:bg-surface-raised/60 transition-colors",

            // High Glass
            glass: "glass shadow-2xl",

            // Neo: Darker, cleaner
            neo: "bg-[#0f0f0f] border border-white/5"
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-3xl overflow-hidden", // The "No-Box" Rule: Extreme Rounding
                    variants[variant],
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = "Card";
