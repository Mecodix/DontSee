import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "../../utils/cn";
import { Loader2 } from "lucide-react";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "ghost" | "glass" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {

    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_0_20px_rgba(208,188,255,0.3)]",
      secondary: "bg-surface-raised text-white border border-border hover:bg-white/5",
      ghost: "bg-transparent text-white/70 hover:text-white hover:bg-white/5",
      glass: "bg-surface-glass backdrop-blur-md border border-white/10 text-white hover:bg-white/10 shadow-lg",
      outline: "bg-transparent border border-primary/50 text-primary hover:bg-primary/10",
    };

    const sizes = {
      sm: "h-9 px-4 text-xs rounded-lg",
      md: "h-12 px-6 text-sm rounded-xl",
      lg: "h-14 px-8 text-base rounded-2xl",
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        whileHover={{ scale: 1.01 }}
        disabled={disabled || isLoading}
        className={cn(
          "relative inline-flex items-center justify-center font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none font-brand tracking-wide",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
