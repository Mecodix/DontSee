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

    // Updated to support multiple progress messages before the final result
    private sendRequest(
        message: WorkerRequest,
        transferrables: Transferable[],
        onProgress?: (p: number) => void
    ): Promise<WorkerResponse> {
        if (!this.worker) this.initWorker();
        
        return new Promise((resolve, reject) => {
            if (!this.worker) return reject('Worker not initialized');

            const handler = (e: MessageEvent) => {
                const data = e.data as WorkerResponse;

                // Handle Progress
                if (data.progress !== undefined) {
                    if (onProgress) onProgress(data.progress);
                    // Do not resolve/remove listener yet, waiting for final result
                    return;
                }

                // Handle Final Result or Error
                this.worker?.removeEventListener('message', handler);
                resolve(data);
            };

            this.worker.addEventListener('message', handler);
            this.worker.postMessage(message, transferrables);
        });
    }

    public async scanImage(imageData: ArrayBuffer): Promise<SignatureType> {
        // Scan is fast, no progress needed
        const result = await this.sendRequest({ type: 'scan', imageData }, [imageData]);
        return result.signature || null;
    }

    public async encode(
        imageData: ArrayBuffer,
        message: string,
        password?: string,
        onProgress?: (p: number) => void
    ): Promise<ArrayBuffer> {
        const result = await this.sendRequest({ 
            type: 'encode', 
            imageData, 
            message, 
            password: password || '' 
        }, [imageData], onProgress);

        if (result.success && result.pixels) {
            return result.pixels;
        }
        throw new Error(result.error || 'Encoding failed');
    }

    public async decode(
        imageData: ArrayBuffer,
        password?: string,
        onProgress?: (p: number) => void
    ): Promise<string> {
        const result = await this.sendRequest({ 
            type: 'decode', 
            imageData, 
            password: password || '' 
        }, [imageData], onProgress);

        if (result.success && result.text !== undefined) {
            return result.text;
        }
        throw new Error(result.error || 'Decoding failed');
    }
}

export const steganographyService = new SteganographyService();
