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
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                        {startIcon}
                    </div>
                )}
                <input
                    ref={ref}
                    className={cn(
                        "w-full bg-surface border text-white text-sm rounded-2xl py-4 pr-4 transition-all placeholder-outline focus:outline-none focus:ring-1",
                        startIcon ? "pl-12" : "pl-4",
                        error
                            ? "border-error focus:border-error focus:ring-error"
                            : "border-secondary-container focus:border-primary focus:ring-primary",
                        className
                    )}
                    {...props}
                />
            </div>
        );
    }
);

Input.displayName = "Input";
