import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'raised';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'default', children, ...props }, ref) => {
        const variants = {
            default: "bg-surface-container border border-secondary-container",
            raised: "bg-surface-raised border border-secondary-container"
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-[32px] overflow-hidden",
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
