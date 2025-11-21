import React from 'react';
import { NotificationState } from '../types';
import { IconCheck, IconX } from './Icons';

interface ToastProps {
    notification: NotificationState | null;
}

export const Toast: React.FC<ToastProps> = ({ notification }) => {
    if (!notification) return null;

    const isError = notification.type === 'error';

    return (
        <div className={`fixed top-10 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl z-[100] animate-slide-down flex items-center gap-3 min-w-[320px] border backdrop-blur-md
            ${isError ? 'bg-[#3f2e4d] text-[#f2b8b5] border-error-container' : 'bg-[#2b2930] text-primary border-secondary-container'}`}>
            {isError ? <IconX className="shrink-0" /> : <IconCheck className="shrink-0" />}
            <p className="text-sm font-medium">{notification.msg}</p>
        </div>
    );
};