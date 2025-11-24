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

// Shared LCG / Scatter Logic - Pure RNG
function createScatterIterator(seed: number, bodyValidCount: number) {
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
            const logicalBodyIndex = (start + i * step) % bodyValidCount;
            const targetIdx = getPhysicalIndex(logicalBodyIndex);
            i++;
            return targetIdx;
        }
    };
}

// Derive Key AND Salt from Password + Dimensions
// Solution 1: getStableScatterSeed concept merged into deriveSecrets
async function deriveSecrets(password: string, width: number, height: number) {
    const enc = new TextEncoder();

    // Hash (Password + Width + Height) to get Key Material
    // This creates a unique key/seed per image dimension, providing robust "Stable Dimensions Check".
    const dataToHash = enc.encode(`${password}:${width}:${height}`);
    const keyMaterial = await crypto.subtle.digest('SHA-256', dataToHash);
    const keyBytes = new Uint8Array(keyMaterial);

    // Use first 16 bytes as Salt
    const salt = keyBytes.slice(0, 16);

    const rawKey = await argon2id({
        password: password,
        salt: salt,
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

    // 1. Secrets Derivation (now uses dimensions)
    const { key, seed } = await deriveSecrets(password, width, height);

    // 2. Prepare Payload
    let actualData: Uint8Array;
    if (supportsCompression()) {
        actualData = await compress(message);
    } else {
        actualData = new TextEncoder().encode(message);
    }

    // Solution 2: Store Dimensions in Payload Header
    // Header = [Width (4 bytes)][Height (4 bytes)]
    const dimHeader = new Uint8Array(8);
    const view = new DataView(dimHeader.buffer);
    view.setUint32(0, width, true);
    view.setUint32(4, height, true);

    const fullPayload = new Uint8Array(dimHeader.length + actualData.length);
    fullPayload.set(dimHeader, 0);
    fullPayload.set(actualData, 8);

    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bits

    // 3. AAD Binding
    // We stick to simple versioning for AAD, relying on the Payload Dimension Check for anti-transplant.
    const aad = new TextEncoder().encode("DontSee_v1");

    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv, additionalData: aad },
        key,
        fullPayload
    );
    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const dataBitsLength = encryptedBytes.length * 8;

    // 4. Construct Bit Stream: [IV (96)] + [Length (32)] + [Encrypted Body]
    const totalPayloadBits = IV_BITS + LENGTH_BITS + dataBitsLength;

    // Capacity Check
    const totalPixels = pixels.length / 4;
    const totalAvailableBits = totalPixels * 3;
    if (totalPayloadBits > totalAvailableBits) {
         throw new Error("Message too long for this image size");
    }

    // 5. Writing Phase
    const bodyValidCount = (pixels.length / 4) * 3;
    const iterator = createScatterIterator(seed, bodyValidCount);

    let lastReportTime = performance.now();

    const getBit = (i: number): number => {
        if (i < IV_BITS) {
            const byteIdx = Math.floor(i / 8);
            const bitIdx = 7 - (i % 8);
            return (iv[byteIdx] >>> bitIdx) & 1;
        } else if (i < IV_BITS + LENGTH_BITS) {
            const lenOffset = i - IV_BITS;
             return parseInt(dataBitsLength.toString(2).padStart(32, '0')[lenOffset]);
        } else {
            const bodyOffset = i - (IV_BITS + LENGTH_BITS);
            const byteIdx = Math.floor(bodyOffset / 8);
            const bitIdx = 7 - (bodyOffset % 8);
            return (encryptedBytes[byteIdx] >>> bitIdx) & 1;
        }
    };

    for (let i = 0; i < totalPayloadBits; i++) {
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

    // 1. Derive Secrets (Using Dimensions)
    const { key, seed } = await deriveSecrets(password, width, height);

    const bodyValidCount = (pixels.length / 4) * 3;
    const iterator = createScatterIterator(seed, bodyValidCount);

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

    // 5. Decrypt
    try {
        const aad = new TextEncoder().encode("DontSee_v1");

        const decryptedBuf = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv, additionalData: aad },
            key,
            encryptedBytes
        );
        const fullPayload = new Uint8Array(decryptedBuf);

        // 6. Verify Dimensions (Solution 2)
        if (fullPayload.length < 8) throw new Error("Payload too short");

        const view = new DataView(fullPayload.buffer);
        const storedWidth = view.getUint32(0, true);
        const storedHeight = view.getUint32(4, true);

        if (storedWidth !== width || storedHeight !== height) {
            throw new Error("Data integrity mismatch: Image dimensions do not match signed payload.");
        }

        const actualData = fullPayload.slice(8);

        // Decompress
        let text: string;
        const isGzip = actualData.length >= 2 && actualData[0] === 0x1F && actualData[1] === 0x8B;

        if (isGzip) {
            if (supportsCompression()) {
                text = await decompress(actualData);
            } else {
                throw new Error("Compressed data found but decompression unsupported.");
            }
        } else {
            text = new TextDecoder().decode(actualData);
        }

        postMessage({ id, success: true, text });

    } catch (e) {
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
            width = imageData.width;
            height = imageData.height;
        } else {
            throw new Error("No image data provided");
        }

        if (type === 'encode') {
            await handleEncode(id, pixels, canvas, ctx, width, height, message, password);
        } else if (type === 'decode') {
            await handleDecode(id, pixels, width, height, password);
        } else if (type === 'scan') {
             postMessage({ id, success: true, signature: null });
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown worker error";
        postMessage({ id, success: false, error: errorMessage });
    }
};
