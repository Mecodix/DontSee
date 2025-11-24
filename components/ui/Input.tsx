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
                    <div className={cn(
                        "absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-all duration-300",
                        // Logic: If inputType is 'password' (hidden), allow glow on focus.
                        // If 'text' (visible), stay neutral gray/white even on focus.
                        inputType === 'password'
                            ? "text-gray-500 group-focus-within:text-primary group-focus-within:drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                            : "text-gray-500 group-focus-within:text-white"
                    )}>
                        {startIcon}
                    </div>
                )}
                <input
                    ref={ref}
                    type={inputType}
                    className={cn(
                        "w-full bg-white/5 border border-white/10 text-white text-base rounded-2xl py-4 transition-all duration-300 placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.07]",
                        // Condition: Only apply purple border and glow if type is PASSWORD.
                        // If visible text, apply neutral white border/text.
                        inputType === 'password'
                             ? "focus:border-primary/50 focus:shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                             : "focus:border-white/30 focus:shadow-none",
                        startIcon ? "pl-12" : "pl-4",
                        isPassword ? "pr-12" : "pr-4",
                        error
                            ? "border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
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
                             // Re-using IconBlinkingEye but it has animation, might want a static one?
                             // User asked for "eye icon". IconBlinkingEye is the only 'open eye' we have.
                             // It's fine.
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
