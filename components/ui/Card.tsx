import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "../../utils/cn";

interface CardProps extends HTMLMotionProps<"div"> {
  variant?: "glass" | "solid";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "glass", children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-[32px] overflow-hidden border transition-all duration-300",
          variant === "glass"
            ? "bg-surface-glass backdrop-blur-2xl border-white/10 shadow-2xl"
            : "bg-surface-raised border-border shadow-xl",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = "Card";
