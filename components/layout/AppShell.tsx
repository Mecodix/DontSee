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
    headerTitle,
    headerDesc,
    showToast,
    dragOverlay
}) => {
    return (
        <div className="min-h-screen w-full flex flex-col items-center py-8 px-4 relative bg-surface text-white">
            {showToast}
            {dragOverlay}

            {/* Header */}
            <header className="w-full max-w-5xl flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                    <div className="bg-primary text-on-primary p-2.5 rounded-xl">
                        <IconBlinkingEye className="w-6 h-6" />
                    </div>
                    <Typography variant="h1">
                        Dont<span className="text-primary">See</span>
                    </Typography>
                </div>
            </header>

            {/* Main Content Area */}
            <main className={cn(
                "w-full max-w-5xl bg-surface-container border border-secondary-container rounded-[32px]",
                "overflow-hidden shadow-xl flex flex-col md:flex-row min-h-[600px]"
            )}>
                {children}
            </main>

            {/* Footer */}
            <footer className="mt-12 text-center flex items-center justify-center gap-2">
                <Typography variant="label">
                    Crafted with
                </Typography>
                <IconHeart className="w-4 h-4 text-primary" />
                <Typography variant="label">
                    by Ayush
                </Typography>
            </footer>
        </div>
    );
};
