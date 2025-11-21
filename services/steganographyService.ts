import { WorkerRequest, WorkerResponse, SignatureType } from '../types';

class SteganographyService {
    private worker: Worker | null = null;
    private pendingRequests = new Map<string, { resolve: (res: WorkerResponse) => void, reject: (err: any) => void }>();

    constructor() {
        this.initWorker();
    }

    private initWorker() {
        this.worker = new Worker(new URL('./processor.worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
            const { id, ...response } = e.data;
            const handler = this.pendingRequests.get(id);
            if (handler) {
                handler.resolve({ id, ...response });
                this.pendingRequests.delete(id);
            }
        };
        this.worker.onerror = (e) => {
            console.error("Worker error:", e);
        };
    }

    public terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.pendingRequests.clear();
        }
    }

    private sendRequest(message: Omit<WorkerRequest, 'id'>, transferrables: Transferable[]): Promise<WorkerResponse> {
        if (!this.worker) this.initWorker();
        
        return new Promise((resolve, reject) => {
            if (!this.worker) return reject('Worker not initialized');

            const id = crypto.randomUUID();
            this.pendingRequests.set(id, { resolve, reject });

            this.worker.postMessage({ ...message, id }, transferrables);
        });
    }

    public async scanImage(imageData: ArrayBuffer): Promise<SignatureType> {
        const result = await this.sendRequest({ type: 'scan', imageData }, [imageData]);
        return result.signature || null;
    }

    public async encode(imageData: ArrayBuffer, message: string, password?: string): Promise<ArrayBuffer> {
        const result = await this.sendRequest({ 
            type: 'encode', 
            imageData, 
            message, 
            password: password || '' 
        }, [imageData]);

        if (result.success && result.pixels) {
            return result.pixels;
        }
        throw new Error(result.error || 'Encoding failed');
    }

    public async decode(imageData: ArrayBuffer, password?: string): Promise<string> {
        const result = await this.sendRequest({ 
            type: 'decode', 
            imageData, 
            password: password || '' 
        }, [imageData]);

        if (result.success && result.text !== undefined) {
            return result.text;
        }
        throw new Error(result.error || 'Decoding failed');
    }
}

export const steganographyService = new SteganographyService();
