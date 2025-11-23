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
        <div className="min-h-screen w-full flex flex-col items-center py-6 px-4 md:py-12 relative overflow-x-hidden">
            {showToast}
            {dragOverlay}

            {/* Global Header */}
            <header className="w-full max-w-xl flex justify-center items-center mb-10 z-10">
                <div className="flex items-center gap-3 glass-panel px-6 py-3 rounded-full">
                    <div className="text-primary animate-pulse-slow">
                        <IconBlinkingEye className="w-6 h-6" />
                    </div>
                    <Typography variant="h3" className="text-xl tracking-tight">
                        Dont<span className="text-primary font-bold">See</span>
                    </Typography>
                </div>
            </header>

            {/* Main Content Area - Single Column */}
            <main className="w-full max-w-xl relative z-10 flex flex-col gap-6 animate-enter">
                {children}
            </main>

            {/* Footer */}
            <footer className="mt-16 text-center flex flex-col items-center justify-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2">
                    <Typography variant="caption" className="text-gray-500">
                        Crafted with
                    </Typography>
                    {/* Updated Heart Icon to Pink as requested */}
                    <IconHeart className="w-3 h-3 text-pink-500 animate-pulse" />
                    <Typography variant="caption" className="text-gray-500">
                        by Ayush
                    </Typography>
                </div>
            </footer>
        </div>
    );
};
