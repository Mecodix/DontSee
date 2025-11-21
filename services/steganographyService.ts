
import { workerScript } from './workerScript';
import { WorkerRequest, WorkerResponse, SignatureType } from '../types';

class SteganographyService {
    private worker: Worker | null = null;

    constructor() {
        this.initWorker();
    }

    private initWorker() {
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
    }

    public terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }

    private sendRequest(message: WorkerRequest, transferrables: Transferable[]): Promise<WorkerResponse> {
        if (!this.worker) this.initWorker();
        
        return new Promise((resolve, reject) => {
            if (!this.worker) return reject('Worker not initialized');

            const handler = (e: MessageEvent) => {
                this.worker?.removeEventListener('message', handler);
                resolve(e.data);
            };

            this.worker.addEventListener('message', handler);
            this.worker.postMessage(message, transferrables);
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
