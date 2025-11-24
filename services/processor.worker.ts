import { argon2id } from 'hash-wasm';
import {
    IV_BITS,
    LENGTH_BITS
} from '../utils/constants';

// Types
type PixelArray = Uint8ClampedArray;

// Feature Detection
function supportsCompression() {
    return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

// PRNG (Mulberry32)
function mulberry32(a: number) {
    return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

// GCD helper for LCG
function gcd(a: number, b: number): number {
    while (b !== 0) {
        let t = b;
        b = a % b;
        a = t;
    }
    return a;
}

// Convert logical valid index (ignoring alphas) to physical RGBA index
function getPhysicalIndex(logicalIndex: number): number {
    // logicalIndex = 3 * q + r
    // physicalIndex = 4 * q + r
    const q = Math.floor(logicalIndex / 3);
    const r = logicalIndex % 3;
    return (q * 4) + r;
}

// Helper: Check local variance (Adaptive Steganography)
// Returns true if the pixel is "noisy enough" to modify, false if it's too smooth.
function isPixelNoisy(pixels: PixelArray, physicalIndex: number, width: number, threshold: number = 5): boolean {
    // Simple neighbor check: Compare with right neighbor (if exists)
    // A robust implementation would check N/S/E/W, but for performance in a tight loop we check minimal neighbors.
    // physicalIndex is R, G, or B component.

    // Safety check for bounds
    if (physicalIndex + 4 >= pixels.length) return true; // Edge case: always allow

    const currentVal = pixels[physicalIndex];
    const rightVal = pixels[physicalIndex + 4]; // Next pixel's same component

    // If difference is greater than threshold, it's an edge/texture.
    return Math.abs(currentVal - rightVal) > threshold;
}

// Shared LCG / Scatter Logic with Adaptive Skip
// Returns an iterator that yields physical indices
function createScatterIterator(seed: number, bodyValidCount: number, pixels: PixelArray, width: number) {
    const random = mulberry32(seed);

    let start = Math.floor(random() * bodyValidCount);
    let step = Math.floor(random() * bodyValidCount);
    if (step === 0) step = 1;
    while (gcd(step, bodyValidCount) !== 1) {
        step = Math.floor(random() * bodyValidCount);
        if (step === 0) step = 1;
    }

    let i = 0;

    return {
        next: () => {
             // Adaptive Loop: Keep skipping until we find a suitable pixel or hit a safety limit
            let attempts = 0;
            let targetIdx = 0;

            do {
                const logicalBodyIndex = (start + i * step) % bodyValidCount;
                targetIdx = getPhysicalIndex(logicalBodyIndex);

                i++; // Always advance the sequence
                attempts++;

                // Safety valve: If we search 100 times and find only smooth pixels, just use the last one.
                // This prevents infinite loops in perfectly flat images (like a solid color block).
                if (attempts > 50) break;

            } while (!isPixelNoisy(pixels, targetIdx, width));

            return targetIdx;
        }
    };
}

// Derive Key AND Salt from Password
// Double-Derive: SHA-256(Password) -> KeyMaterial.
// Split KeyMaterial -> UserKey (for encryption) + Salt (for scattering)
async function deriveSecrets(password: string) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.digest('SHA-256', enc.encode(password));
    const keyBytes = new Uint8Array(keyMaterial);

    // Use first 16 bytes as Salt, next 16 bytes as "Pre-Key" for Argon2
    const salt = keyBytes.slice(0, 16);
    const preKey = keyBytes.slice(16, 32);

    // We still use Argon2id for the actual encryption key to make brute-force hard
    // But now the Salt is deterministic based on the password.

    const rawKey = await argon2id({
        password: password, // Use original password
        salt: salt,         // Derived salt
        parallelism: 1,
        iterations: 16,
        memorySize: 16384,
        hashLength: 32,
        outputType: 'binary'
    });

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        rawKey,
        "AES-GCM",
        false,
        ["encrypt", "decrypt"]
    );

    // Derive Seed for LCG from the same salt
    const seedView = new DataView(salt.buffer);
    // XOR the four 32-bit words of the salt to get one 32-bit seed
    const seed = seedView.getUint32(0) ^ seedView.getUint32(4) ^ seedView.getUint32(8) ^ seedView.getUint32(12);

    return { key: cryptoKey, seed, salt };
}


// Compression Helpers
async function compress(text: string): Promise<Uint8Array> {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decompress(data: Uint8Array): Promise<string> {
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
}

async function handleEncode(
    id: string,
    pixels: PixelArray,
    canvas: OffscreenCanvas | null,
    ctx: OffscreenCanvasRenderingContext2D | null,
    width: number,
    height: number,
    message: string,
    password?: string
) {
    if (!password) throw new Error("Password is required for secure encoding.");

    // 1. Secrets Derivation
    const { key, seed } = await deriveSecrets(password);

    // 2. Prepare Payload
    let dataPayload: Uint8Array;
    if (supportsCompression()) {
        dataPayload = await compress(message);
    } else {
        dataPayload = new TextEncoder().encode(message);
    }

    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bits

    // 3. AAD Binding (Dimensions + Total Bytes)
    // This binds the encrypted data to this specific image container size
    const aad = new TextEncoder().encode(`${width}x${height}:${pixels.length}`);

    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv, additionalData: aad },
        key,
        dataPayload
    );
    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const dataBitsLength = encryptedBytes.length * 8;

    // 4. Construct Bit Stream: [IV (96)] + [Length (32)] + [Encrypted Body]
    // Total Bits needed
    const totalPayloadBits = IV_BITS + LENGTH_BITS + dataBitsLength;

    // Capacity Check
    const totalPixels = pixels.length / 4;
    const totalAvailableBits = totalPixels * 3;
    if (totalPayloadBits > totalAvailableBits) {
         throw new Error("Message too long for this image size");
    }

    // 5. Writing Phase (Adaptive & Scattered)
    const bodyValidCount = (pixels.length / 4) * 3;
    const iterator = createScatterIterator(seed, bodyValidCount, pixels, width);

    let lastReportTime = performance.now();

    // Helper to get bit at global stream index
    const getBit = (i: number): number => {
        if (i < IV_BITS) {
            // IV
            const byteIdx = Math.floor(i / 8);
            const bitIdx = 7 - (i % 8);
            return (iv[byteIdx] >>> bitIdx) & 1;
        } else if (i < IV_BITS + LENGTH_BITS) {
            // Length
            const lenOffset = i - IV_BITS;
             // Length is 32 bits. We write it MSB first.
             // We can convert length to binary string and pick.
             // Optimization: string conversion is easier to read/debug
             return parseInt(dataBitsLength.toString(2).padStart(32, '0')[lenOffset]);
        } else {
            // Body
            const bodyOffset = i - (IV_BITS + LENGTH_BITS);
            const byteIdx = Math.floor(bodyOffset / 8);
            const bitIdx = 7 - (bodyOffset % 8);
            return (encryptedBytes[byteIdx] >>> bitIdx) & 1;
        }
    };

    for (let i = 0; i < totalPayloadBits; i++) {
        // Progress
        if (i % 1000 === 0) {
            const now = performance.now();
            if (now - lastReportTime > 33) {
                const progress = Math.floor((i / totalPayloadBits) * 100);
                postMessage({ id, success: true, progress });
                await new Promise(r => setTimeout(r, 0));
                lastReportTime = performance.now();
            }
        }

        const targetIdx = iterator.next();
        const bit = getBit(i);

        if (bit === 1) pixels[targetIdx] |= 1;
        else pixels[targetIdx] &= ~1;
    }

    // Finalize
    postMessage({ id, success: true, progress: 100 });

    if (canvas && ctx) {
        const newImageData = new ImageData(pixels, canvas.width, canvas.height);
        ctx.putImageData(newImageData, 0, 0);
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        postMessage({ id, success: true, blob });
    } else {
        postMessage({ id, success: true, pixels: pixels.buffer, width, height }, { transfer: [pixels.buffer] });
    }
}

async function handleDecode(id: string, pixels: PixelArray, width: number, height: number, password?: string) {
    if (!password) throw new Error("Password required to decrypt.");

    // 1. Derive Secrets (Must match Encode)
    const { key, seed } = await deriveSecrets(password);

    const bodyValidCount = (pixels.length / 4) * 3;
    const iterator = createScatterIterator(seed, bodyValidCount, pixels, width);

    // Helper to read N bits from the scatter stream
    const readBits = (count: number): string => {
        let bits = "";
        for(let i=0; i<count; i++) {
             const targetIdx = iterator.next();
             bits += (pixels[targetIdx] & 1).toString();
        }
        return bits;
    };

    // 2. Read IV
    const ivBits = readBits(IV_BITS);
    const iv = new Uint8Array(12);
    for(let i=0; i<12; i++) iv[i] = parseInt(ivBits.slice(i*8, (i+1)*8), 2);

    // 3. Read Length
    const lenBits = readBits(LENGTH_BITS);
    const dataBitLength = parseInt(lenBits, 2);

    // Sanity Check
    if (dataBitLength <= 0 || dataBitLength > bodyValidCount) {
        throw new Error("Invalid password or no message found.");
    }

    // 4. Read Body
    const encryptedBytes = new Uint8Array(Math.ceil(dataBitLength / 8));
    let lastReportTime = performance.now();

    for (let i = 0; i < dataBitLength; i++) {
        if (i % 1000 === 0) {
             const now = performance.now();
            if (now - lastReportTime > 33) {
                const progress = Math.floor((i / dataBitLength) * 100);
                postMessage({ id, success: true, progress });
                await new Promise(r => setTimeout(r, 0));
                lastReportTime = performance.now();
            }
        }

        const targetIdx = iterator.next();
        const bit = pixels[targetIdx] & 1;

        const byteIdx = Math.floor(i / 8);
        const bitIdx = 7 - (i % 8);
        if (bit) {
            encryptedBytes[byteIdx] |= (1 << bitIdx);
        }
    }

    // 5. Decrypt with AAD Check
    try {
        const aad = new TextEncoder().encode(`${width}x${height}:${pixels.length}`);

        const decryptedBuf = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv, additionalData: aad },
            key,
            encryptedBytes
        );
        const decryptedBytes = new Uint8Array(decryptedBuf);

        // Decompress if needed
        let text: string;
        const isGzip = decryptedBytes.length >= 2 && decryptedBytes[0] === 0x1F && decryptedBytes[1] === 0x8B;

        if (isGzip) {
            if (supportsCompression()) {
                text = await decompress(decryptedBytes);
            } else {
                // If browser lacks compression support but message is compressed, we can't read it.
                // However, our supportsCompression check in encode prevents this scenario mostly.
                throw new Error("Compressed data found but decompression unsupported.");
            }
        } else {
            text = new TextDecoder().decode(decryptedBytes);
        }

        postMessage({ id, success: true, text });

    } catch (e) {
        // IMPORTANT: In True Stego, a decryption failure usually means "Wrong Password" OR "No Message Here".
        // The scatter pattern was wrong, so we read garbage, so Auth Tag check failed.
        // We return a generic error.
        postMessage({ id, success: false, error: "No hidden message found with this password." });
    }
}

self.onmessage = async (e: MessageEvent) => {
    const { id, type, imageData, imageBitmap, password, message } = e.data;

    try {
        let pixels: Uint8ClampedArray;
        let canvas: OffscreenCanvas | null = null;
        let ctx: OffscreenCanvasRenderingContext2D | null = null;
        let width = 0;
        let height = 0;

        if (imageBitmap) {
            width = imageBitmap.width;
            height = imageBitmap.height;
            try {
                canvas = new OffscreenCanvas(width, height);
                ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                    ctx.drawImage(imageBitmap, 0, 0);
                    pixels = ctx.getImageData(0, 0, width, height).data;
                } else {
                     throw new Error("Context creation failed");
                }
            } catch (e) {
                 throw new Error("OffscreenCanvas failed and no fallback pixel source.");
            }
        } else if (imageData) {
            pixels = new Uint8ClampedArray(imageData);
            width = imageData.width; // ImageData has width/height props
            height = imageData.height;
        } else {
            throw new Error("No image data provided");
        }

        if (type === 'encode') {
            await handleEncode(id, pixels, canvas, ctx, width, height, message, password);
        } else if (type === 'decode') {
            await handleDecode(id, pixels, width, height, password);
        } else if (type === 'scan') {
             // Scan is now impossible/irrelevant in True Stego
             postMessage({ id, success: true, signature: null });
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown worker error";
        postMessage({ id, success: false, error: errorMessage });
    }
};
