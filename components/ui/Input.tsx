import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    startIcon?: React.ReactNode;
    error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, startIcon, error, ...props }, ref) => {
        return (
            <div className="relative w-full group">
                {startIcon && (
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-primary transition-colors duration-300">
                        {startIcon}
                    </div>
                )}
                <input
                    ref={ref}
                    className={cn(
                        "w-full bg-white/5 border border-white/10 text-white text-base rounded-2xl py-4 pr-4 transition-all duration-300 placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] focus:shadow-[0_0_20px_rgba(168,85,247,0.15)]",
                        startIcon ? "pl-12" : "pl-4",
                        error
                            ? "border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                            : "",
                        className
                    )}
                    {...props}
                />
            </div>
        );
    }
);

Input.displayName = "Input";
