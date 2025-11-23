import React from 'react';
import { Image, Binary } from 'lucide-react';
import { cn } from '../utils/cn';

interface ImageToDataIconProps {
    className?: string;
}

export const ImageToDataIcon: React.FC<ImageToDataIconProps> = ({ className }) => {
    return (
        <div className={cn(
            "relative w-20 h-20 rounded-full bg-purple-500/10 border border-white/10 flex items-center justify-center overflow-hidden",
            className
        )}>
            {/* Bottom Layer: Image Icon */}
            <div
                className="absolute inset-0 flex items-center justify-center text-gray-400 transition-transform duration-500"
                style={{ clipPath: 'polygon(0 0, 60% 0, 40% 100%, 0 100%)' }}
            >
                <Image className="w-10 h-10" />
            </div>

            {/* Top Layer: Binary Icon */}
            <div
                className="absolute inset-0 flex items-center justify-center text-purple-400 transition-all duration-500 group-hover:scale-105 group-hover:animate-pulse"
                style={{
                    clipPath: 'polygon(60% 0, 100% 0, 100% 100%, 40% 100%)',
                    filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.5))'
                }}
            >
                <Binary className="w-10 h-10" />
            </div>
        </div>
    );
};
