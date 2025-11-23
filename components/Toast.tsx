import React from 'react';
import { AppNotification } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface ToastProps {
    notification: AppNotification | null;
}

export const Toast: React.FC<ToastProps> = ({ notification }) => {
    return (
        <AnimatePresence>
            {notification && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm pointer-events-none px-4">
                     <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className={cn(
                            "pointer-events-auto flex items-center gap-3 p-4 rounded-2xl shadow-2xl backdrop-blur-xl border text-sm font-medium",
                            notification.type === 'error' && "bg-red-500/10 border-red-500/20 text-red-200",
                            notification.type === 'success' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
                            notification.type === 'info' && "bg-blue-500/10 border-blue-500/20 text-blue-200"
                        )}
                     >
                        {notification.type === 'error' && <XCircle className="w-5 h-5 flex-shrink-0" />}
                        {notification.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
                        {notification.type === 'info' && <Info className="w-5 h-5 flex-shrink-0" />}

                        <p className="flex-1">{notification.message}</p>

                        {/*
                           Note: The current Toast logic in useSteganography auto-clears.
                           If manual dismiss is needed, we'd need a callback here.
                           For now, visually this is enough.
                        */}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
