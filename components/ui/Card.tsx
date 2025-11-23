import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'raised' | 'glass';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'default', children, ...props }, ref) => {
        const variants = {
            default: "bg-surface-container/50 border border-white/5",
            raised: "bg-surface-raised/50 border border-white/10 shadow-xl",
            glass: "bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl"
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-[24px] overflow-hidden transition-all duration-300",
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
