import { argon2id } from 'hash-wasm';
import {
    SIG_BITS,
    SALT_BITS,
    IV_BITS,
    LENGTH_BITS,
    SEQUENTIAL_BITS
} from '../utils/constants';

// Constants
const SIG_UNLOCKED = "0100010001010011"; // "DS"
const SIG_UNLOCKED_RAW = "0100010001010101"; // "DU"

// Secure Scattering Signatures (V2)
const SIG_LOCKED_SECURE = "0100010001010000"; // "DP"
const SIG_LOCKED_RAW_SECURE = "0100010001010001"; // "DQ"

// Internal Constant for "Empty Password"
const EMPTY_PASSWORD_SENTINEL = "___DONTSEE_EMPTY_PASSWORD_SENTINEL_V1___";

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

// Count valid bytes up to a physical index
function countValidBytes(physicalIndex: number): number {
    return (3 * Math.floor(physicalIndex / 4)) + (physicalIndex % 4);
}

// Shared LCG / Scatter Logic
function initLCG(seed: number, bodyValidCount: number) {
    const random = mulberry32(seed);

    const start = Math.floor(random() * bodyValidCount);
    let step = Math.floor(random() * bodyValidCount);
    if (step === 0) step = 1;
    while (gcd(step, bodyValidCount) !== 1) {
        step = Math.floor(random() * bodyValidCount);
        if (step === 0) step = 1;
    }
    return { start, step };
}

// Derive Scattering Seed from Salt + Password (SHA-256)
async function deriveScatteringSeed(salt: Uint8Array, password: string): Promise<number> {
    const enc = new TextEncoder();
    const passwordBytes = enc.encode(password);

    const buffer = new Uint8Array(salt.length + passwordBytes.length);
    buffer.set(salt, 0);
    buffer.set(passwordBytes, salt.length);

    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashView = new DataView(hashBuffer);
    return hashView.getUint32(0, true);
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

// Crypto Helper (Argon2id)
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const effectivePassword = (!password || password.length === 0) ? EMPTY_PASSWORD_SENTINEL : password;

    const rawKey = await argon2id({
        password: effectivePassword,
        salt: salt,
        parallelism: 1,
        iterations: 16,
        memorySize: 16384,
        hashLength: 32,
        outputType: 'binary'
    });

    return await crypto.subtle.importKey(
        "raw",
        rawKey,
        "AES-GCM",
        false,
        ["encrypt", "decrypt"]
    );
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
    const hasPassword = password && password.length > 0;
    const canCompress = supportsCompression();

    // Determine Signature
    let signature;
    if (hasPassword) {
        signature = canCompress ? SIG_LOCKED_SECURE : SIG_LOCKED_RAW_SECURE;
    } else {
        signature = canCompress ? SIG_UNLOCKED : SIG_UNLOCKED_RAW;
    }

    // Crypto Setup
    const salt = crypto.getRandomValues(new Uint8Array(16)); // 128 bits
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bits

    // Derive Key
    const key = await deriveKey(password || "", salt);

    // Compress OR Raw
    let dataPayload: Uint8Array;
    if (canCompress) {
        dataPayload = await compress(message);
    } else {
        dataPayload = new TextEncoder().encode(message);
    }

    const encryptedBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, dataPayload);
    const encryptedBytes = new Uint8Array(encryptedBuffer);

    const dataBitsLength = encryptedBytes.length * 8;

    // --- Header Construction ---

    // 1. Sequential Header (Signature + Salt)
    let seqHeaderBits = "";
    seqHeaderBits += signature;
    for(let b of salt) seqHeaderBits += b.toString(2).padStart(8, '0');

    // 2. Scattered Payload (IV + Length + EncryptedData)
    // Note: IV and Length were previously sequential. Now they are scattered to hide them.
    let scatteredPayloadBits = "";
    for(let b of iv) scatteredPayloadBits += b.toString(2).padStart(8, '0');
    scatteredPayloadBits += dataBitsLength.toString(2).padStart(32, '0'); // Length is 32 bits

    const totalPayloadBits = scatteredPayloadBits.length + dataBitsLength;

    // Capacity Check
    const totalPixels = pixels.length / 4;
    const totalAvailableBits = totalPixels * 3;

    // Total required = Sequential (144) + Scattered (128 + body)
    if ((seqHeaderBits.length + totalPayloadBits) > totalAvailableBits) {
            throw new Error("Message too long for this image size");
    }

    // --- Writing Phase ---

    // 1. Write Sequential Header
    let ptr = 0;
    for (let i = 0; i < seqHeaderBits.length; i++) {
        while ((ptr + 1) % 4 === 0) ptr++;
        if (seqHeaderBits[i] === '1') pixels[ptr] |= 1;
        else pixels[ptr] &= ~1;
        ptr++;
    }
    const headerEndIndex = ptr; // Points to where sequential writing stopped

    // 2. Initialize LCG
    const headerValidCount = countValidBytes(headerEndIndex);
    const totalValidCount = (pixels.length / 4) * 3;
    const bodyValidCount = totalValidCount - headerValidCount;

    // Seed Derivation
    let seed: number;
    if (hasPassword) {
        seed = await deriveScatteringSeed(salt, password!);
    } else {
        const saltView = new DataView(salt.buffer);
        seed = saltView.getUint32(0, true);
    }

    const { start, step } = initLCG(seed, bodyValidCount);

    // 3. Write Scattered Payload
    const needed = totalPayloadBits;
    let lastReportTime = performance.now();

    for (let i = 0; i < needed; i++) {
        // Progress reporting
        if (i % 1000 === 0) {
            const now = performance.now();
            if (now - lastReportTime > 33) {
                const progress = Math.floor((i / needed) * 100);
                postMessage({ id, success: true, progress });
                await new Promise(r => setTimeout(r, 0));
                lastReportTime = performance.now();
            }
        }

        // LCG Index Logic
        const logicalBodyIndex = (start + i * step) % bodyValidCount;
        const absoluteLogicalIndex = headerValidCount + logicalBodyIndex;
        const targetIdx = getPhysicalIndex(absoluteLogicalIndex);

        // Bit Extraction
        let bit = 0;
        if (i < scatteredPayloadBits.length) {
            // Metadata (IV + Length)
            bit = parseInt(scatteredPayloadBits[i]);
        } else {
            // Encrypted Body
            const bodyBitIndex = i - scatteredPayloadBits.length;
            const byteIndex = Math.floor(bodyBitIndex / 8);
            const bitSubIndex = 7 - (bodyBitIndex % 8);
            bit = (encryptedBytes[byteIndex] >>> bitSubIndex) & 1;
        }

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

async function handleDecode(id: string, pixels: PixelArray, password?: string) {
    let ptr = 0;
    const readSequentialBits = (count: number) => {
        let bits = "";
        for(let i=0; i<count; i++) {
            while ((ptr + 1) % 4 === 0) ptr++;
            bits += (pixels[ptr] & 1).toString();
            ptr++;
        }
        return bits;
    };

    // --- Read Sequential Header ---
    const sig = readSequentialBits(SIG_BITS); // 16 bits

    const isSecureLocked = (sig === SIG_LOCKED_SECURE || sig === SIG_LOCKED_RAW_SECURE);
    const isUnlocked = (sig === SIG_UNLOCKED || sig === SIG_UNLOCKED_RAW);

    if (!isSecureLocked && !isUnlocked) {
        if (sig === "0100010001001100" || sig === "0100010001001011") {
             throw new Error("Legacy format detected. This secure version does not support old images.");
        }
        throw new Error("No DontSee signature found");
    }

    const saltBits = readSequentialBits(SALT_BITS); // 128 bits
    const salt = new Uint8Array(16);
    for(let i=0; i<16; i++) salt[i] = parseInt(saltBits.slice(i*8, (i+1)*8), 2);

    // --- Initialize LCG ---
    const headerEndIndex = ptr;
    const headerValidCount = countValidBytes(headerEndIndex);
    const totalValidCount = (pixels.length / 4) * 3;
    const bodyValidCount = totalValidCount - headerValidCount;

    let seed: number;
    if (isSecureLocked) {
        seed = await deriveScatteringSeed(salt, password || "");
    } else {
        const saltView = new DataView(salt.buffer);
        seed = saltView.getUint32(0, true);
    }

    const { start, step } = initLCG(seed, bodyValidCount);

    // --- Read Scattered Payload ---
    // We need to read bits one by one from the LCG stream.

    let currentScatteredBitIndex = 0;

    const readScatteredBits = (count: number) => {
        let bits = "";
        for(let i=0; i<count; i++) {
            const logicalBodyIndex = (start + (currentScatteredBitIndex + i) * step) % bodyValidCount;
            const absoluteLogicalIndex = headerValidCount + logicalBodyIndex;
            const targetIdx = getPhysicalIndex(absoluteLogicalIndex);
            bits += (pixels[targetIdx] & 1).toString();
        }
        currentScatteredBitIndex += count;
        return bits;
    };

    // 1. Read IV (96 bits)
    const ivBits = readScatteredBits(IV_BITS);
    const iv = new Uint8Array(12);
    for(let i=0; i<12; i++) iv[i] = parseInt(ivBits.slice(i*8, (i+1)*8), 2);

    // 2. Read Length (32 bits)
    const lenBits = readScatteredBits(LENGTH_BITS);
    const dataBitLength = parseInt(lenBits, 2);

    // FIX 1: Length Bomb Validation
    const maxPossibleBits = bodyValidCount - (IV_BITS + LENGTH_BITS);
    if (dataBitLength <= 0 || dataBitLength > maxPossibleBits) {
        throw new Error("Corrupt header or invalid length (DoS protection)");
    }

    // 3. Read Body
    const bodyBits = new Uint8Array(dataBitLength);
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

        // Manually inline bit read logic for performance/consistency with encode loop
        const logicalBodyIndex = (start + (currentScatteredBitIndex + i) * step) % bodyValidCount;
        const absoluteLogicalIndex = headerValidCount + logicalBodyIndex;
        const targetIdx = getPhysicalIndex(absoluteLogicalIndex);

        bodyBits[i] = pixels[targetIdx] & 1;
    }

    postMessage({ id, success: true, progress: 100 });

    const encryptedBytes = new Uint8Array(dataBitLength / 8);
    for(let i=0; i<encryptedBytes.length; i++) {
        let byteVal = 0;
        for(let bit=0; bit<8; bit++) {
            byteVal = (byteVal << 1) | bodyBits[i*8 + bit];
        }
        encryptedBytes[i] = byteVal;
    }

    // Decrypt
    try {
        const key = await deriveKey(password || "", salt);

        const decryptedBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, encryptedBytes);
        const decryptedBytes = new Uint8Array(decryptedBuf);

        // FIX 2: Garbage Output Check (Magic Bytes)
        let text: string;

        // Check GZIP Magic Bytes (0x1F 0x8B)
        const isGzip = decryptedBytes.length >= 2 && decryptedBytes[0] === 0x1F && decryptedBytes[1] === 0x8B;

        if (isGzip) {
            if (supportsCompression()) {
                text = await decompress(decryptedBytes);
            } else {
                throw new Error("Message is compressed but browser doesn't support decompression.");
            }
        } else {
            // Not GZIP -> Treat as raw text
            text = new TextDecoder().decode(decryptedBytes);
        }

        postMessage({ id, success: true, text });
    } catch(e) {
        const msg = e instanceof Error ? e.message : "Decryption failed";
        postMessage({ id, success: false, error: msg === "Decryption failed" ? "Decryption failed" : msg });
    }
}

function handleScan(id: string, pixels: PixelArray) {
    let ptr = 0;
    let sig = "";
    // Read 16 bits sequentially
    for(let i=0; i<SIG_BITS; i++) {
        while ((ptr + 1) % 4 === 0) ptr++;
        sig += (pixels[ptr] & 1).toString();
        ptr++;
    }

    let result = null;
    if (sig === SIG_LOCKED_SECURE || sig === SIG_LOCKED_RAW_SECURE) {
        result = 'locked';
    } else if (sig === SIG_UNLOCKED || sig === SIG_UNLOCKED_RAW) {
        result = 'unlocked';
    }

    postMessage({ id, success: true, signature: result });
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
            width = 0;
            height = 0;
        } else {
            throw new Error("No image data provided");
        }

        if (type === 'encode') {
            await handleEncode(id, pixels, canvas, ctx, width, height, message, password);
        } else if (type === 'decode') {
            await handleDecode(id, pixels, password);
        } else if (type === 'scan') {
            handleScan(id, pixels);
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown worker error";
        postMessage({ id, success: false, error: errorMessage });
    }
};
