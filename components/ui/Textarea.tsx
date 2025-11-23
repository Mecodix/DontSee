import React from "react";
import { cn } from "../../utils/cn";
import { Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  footer?: React.ReactNode;
  error?: string;
  isExpanded?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, footer, error, ...props }, ref) => {
    const [isExpanded, setIsExpanded] = React.useState(false);

    const toggleExpand = () => setIsExpanded(!isExpanded);

    const content = (
      <div className={cn("relative flex flex-col w-full h-full", isExpanded ? "max-w-4xl mx-auto p-6" : "")}>
         <div className="relative flex-1">
          <textarea
             ref={ref}
             className={cn(
               "w-full h-full bg-surface/50 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-white/20 transition-all duration-300 resize-none font-mono leading-relaxed",
               "focus:outline-none focus:bg-surface-raised focus:border-primary/50 focus:ring-1 focus:ring-primary/50",
               isExpanded ? "min-h-[60vh] text-base" : "min-h-[120px]",
               className
             )}
             {...props}
          />
          <button
            onClick={toggleExpand}
            className="absolute top-3 right-3 p-2 text-white/40 hover:text-primary transition-colors hover:bg-white/5 rounded-lg"
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
         </div>
         {footer && <div className="mt-2">{footer}</div>}
      </div>
    );

    if (isExpanded) {
      return createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
        >
          <div className="w-full max-w-4xl bg-surface-raised border border-white/10 rounded-3xl p-1 shadow-2xl relative">
             <div className="absolute -top-12 left-0 right-0 text-center text-white/50 text-sm font-medium">
                Zen Mode
             </div>
             {content}
          </div>
        </motion.div>,
        document.body
      );
    }

    return (
      <div className="w-full space-y-1.5">
        {label && <label className="text-xs font-medium text-white/60 ml-1">{label}</label>}
        {content}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
