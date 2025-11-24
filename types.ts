
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
    id: string; // Unique ID for concurrency tracking
    type: WorkerRequestType;
    // NEW: Support ImageBitmap for OffscreenCanvas
    imageBitmap?: ImageBitmap;
    // Legacy support for scan (ArrayBuffer is faster for small reads) or fallback
    imageData?: ArrayBuffer;
    width?: number;
    height?: number;
    password?: string;
    message?: string;
}

export type SignatureType = 'locked' | 'unlocked' | null;

export interface WorkerResponse {
    id: string; // Echo back ID to route response
    success: boolean;
    progress?: number;
    // NEW: Return Blob directly from worker
    blob?: Blob;
    pixels?: ArrayBuffer; // Legacy/Fallback
    width?: number; // For fallback reconstruction
    height?: number; // For fallback reconstruction
    text?: string;
    signature?: SignatureType;
    error?: string;
}
