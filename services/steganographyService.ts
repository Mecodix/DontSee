import { WorkerRequest, WorkerResponse, SignatureType } from '../types';

class SteganographyService {
    private worker: Worker | null = null;

    constructor() {
        this.initWorker();
    }

    private initWorker() {
        this.worker = new Worker(new URL('./processor.worker.ts', import.meta.url), { type: 'module' });
    }

    public terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }

    private sendRequest(
        message: WorkerRequest,
        transferrables: Transferable[],
        onProgress?: (p: number) => void
    ): Promise<WorkerResponse> {
        if (!this.worker) this.initWorker();
        
        return new Promise((resolve, reject) => {
            if (!this.worker) return reject('Worker not initialized');

            const cleanup = () => {
                this.worker?.removeEventListener('message', messageHandler);
                this.worker?.removeEventListener('error', errorHandler);
            };

            const messageHandler = (e: MessageEvent) => {
                const data = e.data as WorkerResponse;

                if (data.progress !== undefined) {
                    if (onProgress) onProgress(data.progress);
                    return;
                }

                cleanup();
                resolve(data);
            };

            const errorHandler = (e: ErrorEvent) => {
                cleanup();
                reject(new Error(`Worker error: ${e.message}`));
            };

            this.worker.addEventListener('message', messageHandler);
            this.worker.addEventListener('error', errorHandler);
            this.worker.postMessage(message, transferrables);
        });
    }

    public async scanImage(imageData: ArrayBuffer): Promise<SignatureType> {
        const result = await this.sendRequest({ type: 'scan', imageData }, [imageData]);
        return result.signature || null;
    }

    // Updated to support ImageBitmap input and Blob output
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
