import React from "react";
import { cn } from "../../utils/cn";
import { motion, AnimatePresence } from "framer-motion";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, leftIcon, rightIcon, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && <label className="text-xs font-medium text-white/60 ml-1">{label}</label>}
        <div className="relative group">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full bg-surface/50 border border-white/10 rounded-2xl py-4 text-sm text-white placeholder-white/20 transition-all duration-300",
              "focus:outline-none focus:bg-surface-raised focus:border-primary/50 focus:ring-1 focus:ring-primary/50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              leftIcon ? "pl-12" : "pl-4",
              rightIcon ? "pr-12" : "pr-4",
              error ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/30" : "",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
              {rightIcon}
            </div>
          )}
        </div>
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-red-400 font-medium ml-1"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = "Input";
