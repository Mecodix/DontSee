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

        const variants = {
            primary: "bg-primary hover:bg-white text-on-primary shadow-primary/10",
            secondary: "bg-secondary-container hover:bg-secondary-hover text-white shadow-secondary-container/20",
            ghost: "bg-transparent hover:bg-white/5 text-outline hover:text-white shadow-none",
            destructive: "bg-error-container hover:bg-red-900 text-white shadow-error-container/10"
        };

        const disabledStyles = "opacity-50 cursor-not-allowed active:scale-100 hover:bg-inherit";

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
                        {icon && <span className="w-5 h-5">{icon}</span>}
                        {children}
                    </>
                )}
            </button>
        );
    }
);

Button.displayName = "Button";
