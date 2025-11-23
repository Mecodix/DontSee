import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
    isLoading?: boolean;
    loadingText?: React.ReactNode;
    icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', isLoading, loadingText, icon, children, disabled, ...props }, ref) => {

        const baseStyles = "py-4 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 active:scale-[0.98] flex justify-center items-center gap-2 relative overflow-hidden select-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

        const isInteractive = !isLoading && !disabled;

        const variants = {
            // Updated: Deep solid color, removed external glow/shadow, consistent hover
            primary: cn(
                "bg-primary text-white border border-transparent",
                isInteractive && "hover:bg-violet-400"
            ),
            secondary: cn(
                "bg-white/5 text-white border border-white/10 backdrop-blur-sm",
                isInteractive && "hover:bg-white/10 hover:border-white/20"
            ),
            ghost: cn(
                "bg-transparent text-gray-400",
                isInteractive && "hover:text-white hover:bg-white/5"
            ),
            destructive: cn(
                "bg-red-500/10 text-red-400 border border-red-500/20",
                isInteractive && "hover:bg-red-500/20 hover:text-red-300"
            )
        };

        const disabledStyles = "opacity-50 cursor-not-allowed grayscale";

        return (
            <button
                ref={ref}
                disabled={isLoading || disabled}
                className={cn(
                    baseStyles,
                    variants[variant],
                    (isLoading || disabled) && disabledStyles,
                    className
                )}
                {...props}
            >
                {isLoading ? (
                    <div className="flex items-center gap-2 z-10 relative">
                         <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                         {loadingText && <span>{loadingText}</span>}
                    </div>
                ) : (
                    <>
                        {icon && <span className="w-5 h-5 flex items-center justify-center">{icon}</span>}
                        {children}
                    </>
                )}
            </button>
        );
    }
);

Button.displayName = "Button";
