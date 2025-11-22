
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
    // NEW: Support ImageBitmap for OffscreenCanvas
    imageBitmap?: ImageBitmap;
    // Legacy support for scan (ArrayBuffer is faster for small reads) or fallback
    imageData?: ArrayBuffer;
    password?: string;
    message?: string;
}

export type SignatureType = 'locked' | 'unlocked' | null;

export interface WorkerResponse {
    success: boolean;
    progress?: number;
    // NEW: Return Blob directly from worker
    blob?: Blob;
    pixels?: ArrayBuffer; // Legacy/Fallback
    text?: string;
    signature?: SignatureType;
    error?: string;
}
