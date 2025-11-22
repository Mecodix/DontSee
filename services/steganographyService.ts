import { WorkerRequest, WorkerResponse, SignatureType } from '../types';

interface PendingRequest {
    resolve: (response: WorkerResponse) => void;
    reject: (error: any) => void;
    onProgress?: (p: number) => void;
}

class SteganographyService {
    private worker: Worker | null = null;
    private pendingRequests = new Map<string, PendingRequest>();

    constructor() {
        this.initWorker();
    }

    private initWorker() {
        this.worker = new Worker(new URL('./processor.worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = this.handleWorkerMessage.bind(this);
        this.worker.onerror = this.handleWorkerError.bind(this);
    }

    private handleWorkerMessage(e: MessageEvent) {
        const data = e.data as WorkerResponse;
        const { id, progress, success, error } = data;

        const request = this.pendingRequests.get(id);
        if (!request) return; // Request might have been cancelled or ID is wrong

        if (progress !== undefined) {
            if (request.onProgress) {
                request.onProgress(progress);
            }
            return;
        }

        // Completion or Error
        if (success) {
            request.resolve(data);
        } else {
            request.reject(new Error(error || 'Unknown worker error'));
        }

        this.pendingRequests.delete(id);
    }

    private handleWorkerError(e: ErrorEvent) {
        console.error("Worker global error:", e);
        // Global worker error - might need to reject all pending?
        // For now, relying on per-request error handling if possible,
        // but this usually means the worker crashed or syntax error.
        // Let's iterate and reject all.
        for (const [id, req] of this.pendingRequests) {
            req.reject(new Error(`Worker crashed: ${e.message}`));
        }
        this.pendingRequests.clear();

        // Restart worker for future requests
        this.terminate();
        this.initWorker();
    }

    public terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.pendingRequests.clear();
    }

    private sendRequest(
        messageWithoutId: Omit<WorkerRequest, 'id'>,
        transferrables: Transferable[],
        onProgress?: (p: number) => void
    ): Promise<WorkerResponse> {
        if (!this.worker) this.initWorker();
        
        const id = crypto.randomUUID();
        const message = { ...messageWithoutId, id } as WorkerRequest;

        return new Promise((resolve, reject) => {
            if (!this.worker) return reject('Worker not initialized');

            this.pendingRequests.set(id, { resolve, reject, onProgress });
            this.worker.postMessage(message, transferrables);
        });
    }

    public async scanImage(imageData: ArrayBuffer): Promise<SignatureType> {
        const result = await this.sendRequest({ type: 'scan', imageData }, [imageData]);
        return result.signature || null;
    }

    public async encode(
        imageBitmap: ImageBitmap,
        message: string,
        password?: string,
        onProgress?: (p: number) => void
    ): Promise<Blob> {
        const result = await this.sendRequest({ 
            type: 'encode', 
            imageBitmap,
            message, 
            password: password || '' 
        }, [imageBitmap], onProgress);

        if (result.success) {
            if (result.blob) {
                return result.blob;
            }
            // Fallback for OffscreenCanvas failure: Reconstruct Blob from pixels
            if (result.pixels && result.width && result.height) {
                const canvas = document.createElement('canvas');
                canvas.width = result.width;
                canvas.height = result.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error("Failed to create canvas for blob conversion");

                const imageData = new ImageData(new Uint8ClampedArray(result.pixels), result.width, result.height);
                ctx.putImageData(imageData, 0, 0);

                const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                if (blob) return blob;
            }
        }
        throw new Error(result.error || 'Encoding failed');
    }

    public async decode(
        imageBitmap: ImageBitmap,
        password?: string,
        onProgress?: (p: number) => void
    ): Promise<string> {
        const result = await this.sendRequest({ 
            type: 'decode', 
            imageBitmap,
            password: password || '' 
        }, [imageBitmap], onProgress);

        if (result.success && result.text !== undefined) {
            return result.text;
        }
        throw new Error(result.error || 'Decoding failed');
    }
}

export const steganographyService = new SteganographyService();
