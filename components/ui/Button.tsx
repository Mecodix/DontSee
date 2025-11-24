import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'electric';
    isLoading?: boolean;
    loadingText?: React.ReactNode;
    icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', isLoading, loadingText, icon, children, disabled, ...props }, ref) => {

        // Anti-Boring Base: rounded-xl (not fully pill, slightly boxy but smooth), No-Static (active/hover scales)
        const baseStyles = "h-12 px-6 rounded-xl font-display font-bold text-sm tracking-wide transition-all duration-200 active:scale-95 flex justify-center items-center gap-2 relative overflow-hidden select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

        const variants = {
            // Electric Violet: High saturation, slight glow
            primary: "bg-primary text-white shadow-[0_0_20px_-5px_rgba(139,92,246,0.4)] hover:shadow-[0_0_25px_-5px_rgba(139,92,246,0.6)] hover:bg-primary-hover border border-white/10",

            // New "Electric" Variant: Punchy Lime or Cyan (optional, sticking to violet for now but brighter)
            electric: "bg-white text-black hover:bg-gray-100 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]",

            // Glass/Secondary: Subtle border, blur
            secondary: "bg-white/5 text-white border border-white/10 backdrop-blur-md hover:bg-white/10 hover:border-white/20",

            // Ghost: Minimal
            ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-white/5",

            // Destructive: Sharp Red
            destructive: "bg-error/10 text-error border border-error/20 hover:bg-error/20 hover:text-red-300"
        };

        return (
            <button
                ref={ref}
                disabled={isLoading || disabled}
                className={cn(
                    baseStyles,
                    variants[variant],
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
