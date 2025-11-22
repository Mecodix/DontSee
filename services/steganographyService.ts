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

            const handler = (e: MessageEvent) => {
                const data = e.data as WorkerResponse;

                if (data.progress !== undefined) {
                    if (onProgress) onProgress(data.progress);
                    return;
                }

                this.worker?.removeEventListener('message', handler);
                resolve(data);
            };

            this.worker.addEventListener('message', handler);
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

        if (result.success && result.blob) {
            return result.blob;
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
