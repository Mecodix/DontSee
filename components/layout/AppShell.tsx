import React from 'react';
import { IconBlinkingEye, IconHeart } from '../Icons';
import { cn } from '../../utils/cn';
import { Typography } from '../ui/Typography';

interface AppShellProps {
    children: React.ReactNode;
    headerTitle?: string;
    headerDesc?: string;
    showToast?: React.ReactNode;
    dragOverlay?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
    children,
    showToast,
    dragOverlay
}) => {
    return (
        // "No-Midtone" Rule: Deep background handled in global css, here we ensure z-indexing and layout
        <div className="min-h-screen w-full flex flex-col items-center py-8 px-4 md:py-16 relative overflow-x-hidden">
            {showToast}
            {dragOverlay}

            {/* Global Header - Refactored for "Glassmorphism" & "Anti-Boring" */}
            <header className="w-full max-w-xl flex justify-between items-center mb-12 z-20">
                <div className="flex items-center gap-4 bg-surface/50 border border-white/5 backdrop-blur-xl px-6 py-3 rounded-full shadow-2xl transition-transform hover:scale-[1.02] duration-300">
                    <div className="text-primary animate-pulse-slow">
                        <IconBlinkingEye className="w-6 h-6" />
                    </div>
                    <Typography variant="h3" className="text-lg font-bold tracking-tight">
                        Dont<span className="text-primary">See</span>
                    </Typography>
                </div>

                {/* Optional: Add a small status dot or version badge here if needed in future */}
                <div className="hidden md:flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
                     <Typography variant="caption" className="text-white/40">v2.0</Typography>
                </div>
            </header>

            {/* Main Content Area - Single Column but styled to hold Bento blocks */}
            <main className="w-full max-w-xl relative z-10 flex flex-col gap-6">
                {children}
            </main>

            {/* Footer - Minimalist & Cool */}
            <footer className="mt-20 text-center flex flex-col items-center justify-center gap-4 opacity-50 hover:opacity-100 transition-opacity duration-500">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                    <Typography variant="caption" className="text-gray-500 tracking-widest text-[10px]">
                        ENGINEERED BY AYUSH
                    </Typography>
                    <IconHeart className="w-3 h-3 text-primary animate-pulse" />
                </div>
            </footer>
        </div>
    );
};
