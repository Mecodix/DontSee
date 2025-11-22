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

    private getImageDataFromBitmap(imageBitmap: ImageBitmap): Uint8ClampedArray {
        const canvas = document.createElement('canvas');
        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error("Main thread canvas context failed");

        ctx.drawImage(imageBitmap, 0, 0);
        return ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height).data;
    }

    public async encode(
        imageBitmap: ImageBitmap,
        message: string,
        password?: string,
        onProgress?: (p: number) => void
    ): Promise<Blob> {
        let result: WorkerResponse;

        try {
            // Attempt 1: Try with ImageBitmap (uses OffscreenCanvas in worker)
            // Note: We clone the bitmap or ensure it's not neutered if we want to retry.
            // But transferring neuters it. So we can't easily retry with the *same* bitmap object
            // if we transferred it.
            // Strategy: Don't transfer it? Or assume if it fails, we need to re-create source?
            // "imageBitmap" is usually created from a File/Blob in the hook.
            // If we transfer it, it's gone.
            // We shouldn't transfer it if we might need to fallback.
            // But not transferring copies it, which is slow.
            // Compromise: We try to detect OffscreenCanvas support early? No, worker environment differs.

            // Actually, we can fallback by *extracting pixels on main thread first* if we want 100% safety,
            // but that kills performance for the 99% of users who have OffscreenCanvas.

            // If we transfer it, we can't retry.
            // BUT: The caller passes `imageBitmap`. If we transfer it, the caller's reference is neutered.
            // We should arguably *not* transfer it if we want to support fallback, OR we ask caller for source.
            // Let's try NOT transferring it for now? No, that's bad for memory.

            // Better Strategy:
            // Since we can't "un-transfer" or "clone before transfer" efficiently without cost,
            // let's assume we can catch the specific error *without* transferring in the first attempt?
            // No.

            // Alternative:
            // The worker throws "OffscreenCanvas failed".
            // Since we likely neutered the bitmap, we are stuck unless we have the original data.
            // BUT: `AppImage` in `hooks` holds `imgObject` (HTMLImageElement).
            // We create the bitmap in `useSteganography.ts` -> `processEncode`.
            // `const bitmap = await createImageBitmap(image.imgObject);`
            // If `steganographyService.encode` fails, we can't retry inside `steganographyService`
            // because `imageBitmap` is dead.
            // We would need to retry in `useSteganography` (create new bitmap/data).

            // HOWEVER, the requirement is "Robust Browser Support... Modify steganographyService.ts".
            // If I modify *only* the service, I must handle the data source there.
            // I can't.
            // So, I will extract pixels on main thread *if* I suspect fallback is needed? No.

            // Let's look at `useSteganography.ts` again.
            // It calls: `const bitmap = await createImageBitmap(image.imgObject);`
            // If I change `encode` signature to accept `HTMLImageElement | ImageBitmap`?
            // Or `AppImage`?

            // Let's act defensively:
            // If we want to support fallback inside `encode`, we strictly shouldn't transfer the bitmap
            // in the first attempt, OR we accept the performance hit of copying (no transfer).
            // `postMessage(msg, [bitmap])` -> Transfers.
            // `postMessage(msg)` -> Copies.

            // If we Copy (don't transfer), we can retry.
            // Copying a 4K image (32MB) takes a few ms. It's acceptable for a "robust" tool.
            // Let's remove the transfer list for the bitmap.

            result = await this.sendRequest({
                type: 'encode',
                imageBitmap,
                message,
                password: password || ''
            }, [], onProgress); // REMOVED [imageBitmap] from transfer list to allow retry

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            if (errorMsg.includes("OffscreenCanvas") || errorMsg.includes("Context")) {
                // Fallback: Extract pixels on main thread and send as ArrayBuffer
                console.warn("Worker OffscreenCanvas failed. Falling back to main thread pixel extraction.");

                // ImageBitmap is still valid because we didn't transfer it!
                const pixelData = this.getImageDataFromBitmap(imageBitmap);

                result = await this.sendRequest({
                    type: 'encode',
                    imageData: pixelData.buffer, // Transfer this buffer
                    message,
                    password: password || ''
                }, [pixelData.buffer], onProgress);

            } else {
                throw err;
            }
        }

        if (result.success) {
            if (result.blob) {
                return result.blob;
            }
            // Fallback for OffscreenCanvas failure (Worker returned pixels)
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
        // Same logic for decode - don't transfer initially to allow fallback
        let result: WorkerResponse;

        try {
            result = await this.sendRequest({
                type: 'decode',
                imageBitmap,
                password: password || ''
            }, [], onProgress); // REMOVED transfer
        } catch(err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            if (errorMsg.includes("OffscreenCanvas") || errorMsg.includes("Context")) {
                 console.warn("Worker OffscreenCanvas failed (Decode). Falling back.");
                 const pixelData = this.getImageDataFromBitmap(imageBitmap);

                 result = await this.sendRequest({
                    type: 'decode',
                    imageData: pixelData.buffer,
                    password: password || ''
                 }, [pixelData.buffer], onProgress);
            } else {
                throw err;
            }
        }

        if (result.success && result.text !== undefined) {
            return result.text;
        }
        throw new Error(result.error || 'Decoding failed');
    }
}

export const steganographyService = new SteganographyService();
