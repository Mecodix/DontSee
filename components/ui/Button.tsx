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

        const baseStyles = "py-4 rounded-2xl font-bold text-sm uppercase tracking-wider shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-2 relative overflow-hidden select-none";

        const isInteractive = !isLoading && !disabled;

        const variants = {
            primary: cn("bg-primary text-on-primary shadow-primary/10", isInteractive && "hover:bg-white"),
            secondary: cn("bg-secondary-container text-white shadow-secondary-container/20", isInteractive && "hover:bg-secondary-hover"),
            ghost: cn("bg-transparent text-outline shadow-none", isInteractive && "hover:bg-white/5 hover:text-white"),
            destructive: cn("bg-error-container text-white shadow-error-container/10", isInteractive && "hover:bg-red-900")
        };

        const disabledStyles = "opacity-50 cursor-not-allowed active:scale-100";

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
                         <div className={cn(
                             "w-5 h-5 border-4 rounded-full animate-spin-slow",
                             variant === 'primary' ? "border-on-primary/30 border-t-on-primary" : "border-white/30 border-t-white"
                         )} aria-label="Processing"></div>
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
