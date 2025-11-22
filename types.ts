
export enum AppMode {
    HIDE = 'hide',
    SEE = 'see'
}

export interface AppImage {
    imgObject: HTMLImageElement;
    width: number;
    height: number;
    src: string;
    name: string;
}

export interface NotificationState {
    type: 'success' | 'error';
    msg: string;
}

// Worker Message Types
export type WorkerRequestType = 'encode' | 'decode' | 'scan';

export interface WorkerRequest {
    type: WorkerRequestType;
    imageData: ArrayBuffer; // Transferable
    password?: string;
    message?: string;
}

export type SignatureType = 'locked' | 'unlocked' | null;

export interface WorkerResponse {
    success: boolean;
    // For progress updates
    progress?: number;
    // For final results
    pixels?: ArrayBuffer;
    text?: string;
    signature?: SignatureType;
    error?: string;
}
