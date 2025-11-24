import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { IconBlinkingEye, IconEyeOff } from '../Icons';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    startIcon?: React.ReactNode;
    error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, startIcon, error, type, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);

        const isPassword = type === 'password';
        const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

        return (
            <div className="relative w-full group">
                {startIcon && (
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-primary transition-colors duration-200">
                        {startIcon}
                    </div>
                )}
                <input
                    ref={ref}
                    type={inputType}
                    className={cn(
                        // No-Box: rounded-xl
                        // No-Midtone: Dark bg (white/5), High contrast text
                        "w-full bg-white/5 border border-white/10 text-white font-medium text-base rounded-xl py-4 transition-all duration-200 placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.1)]",
                        startIcon ? "pl-12" : "pl-4",
                        isPassword ? "pr-12" : "pr-4",
                        error
                            ? "border-error/50 focus:border-error focus:shadow-[0_0_0_4px_rgba(239,68,68,0.1)]"
                            : "",
                        className
                    )}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                         {showPassword ? (
                             <IconBlinkingEye className="w-5 h-5" />
                         ) : (
                             <IconEyeOff className="w-5 h-5" />
                         )}
                    </button>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";
