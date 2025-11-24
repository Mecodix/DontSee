// Reproduction Script for Steganography Logic
import { argon2id } from 'hash-wasm';

// Use Node's webcrypto implementation
const crypto = globalThis.crypto;

// --- Mock Constants ---
const IV_BITS = 96;
const LENGTH_BITS = 32;

// --- Mock Utils ---
function mulberry32(a: number) {
    return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

function gcd(a: number, b: number): number {
    while (b !== 0) {
        let t = b;
        b = a % b;
        a = t;
    }
    return a;
}

function getPhysicalIndex(logicalIndex: number) {
    const q = Math.floor(logicalIndex / 3);
    const r = logicalIndex % 3;
    return (q * 4) + r;
}

// SIMPLIFIED: No adaptive noise check (assume all valid) for core logic test
function isPixelNoisy(pixels: any, physicalIndex: any, width: any, threshold = 5) {
    return true;
}

function createScatterIterator(seed: number, bodyValidCount: number, pixels: any, width: number) {
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
            let targetIdx = 0;
            const logicalBodyIndex = (start + i * step) % bodyValidCount;
            targetIdx = getPhysicalIndex(logicalBodyIndex);
            i++;
            return targetIdx;
        }
    };
}

async function deriveSecrets(password: string) {
    const enc = new TextEncoder();
    // SHA-256 of password
    const keyMaterial = await crypto.subtle.digest('SHA-256', enc.encode(password));
    const keyBytes = new Uint8Array(keyMaterial);

    const salt = keyBytes.slice(0, 16);

    // Argon2id
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

    const seedView = new DataView(salt.buffer);
    const seed = seedView.getUint32(0) ^ seedView.getUint32(4) ^ seedView.getUint32(8) ^ seedView.getUint32(12);

    return { key: cryptoKey, seed, salt };
}

// --- Main Test ---
async function test() {
    console.log("Starting consistency test...");

    const password = "testpassword123";
    const width = 100;
    const height = 100;
    const pixels = new Uint8ClampedArray(width * height * 4); // White image
    pixels.fill(255);

    // 1. Derive Secrets (Encode)
    const { key: encKey, seed: encSeed } = await deriveSecrets(password);
    console.log("Encode Seed:", encSeed);

    // 2. Derive Secrets (Decode)
    const { key: decKey, seed: decSeed } = await deriveSecrets(password);
    console.log("Decode Seed:", decSeed);

    if (encSeed !== decSeed) {
        console.error("FAIL: Seeds mismatch!");
        process.exit(1);
    } else {
        console.log("PASS: Seeds match.");
    }

    // 3. Scattering Consistency
    const bodyValidCount = (pixels.length / 4) * 3;
    const encIter = createScatterIterator(encSeed, bodyValidCount, pixels, width);
    const decIter = createScatterIterator(decSeed, bodyValidCount, pixels, width);

    let match = true;
    for(let i=0; i<100; i++) {
        const eIdx = encIter.next();
        const dIdx = decIter.next();
        if (eIdx !== dIdx) {
            console.error(`FAIL: Iterator mismatch at ${i}: ${eIdx} vs ${dIdx}`);
            match = false;
            break;
        }
    }
    if (match) console.log("PASS: Scatter iterators match.");

    // 4. AAD Consistency
    const aadString = `${width}x${height}:${pixels.length}`;
    console.log("AAD:", aadString);
    // This is purely string based, so as long as width/height/len are same, it matches.

    // 5. Encrypt/Decrypt Check
    const message = "Hello World";
    const dataPayload = new TextEncoder().encode(message);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const aad = new TextEncoder().encode(aadString);

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv, additionalData: aad },
        encKey,
        dataPayload
    );

    try {
        const decrypted = await crypto.subtle.decrypt(
             { name: "AES-GCM", iv: iv, additionalData: aad },
             decKey,
             encrypted
        );
        console.log("PASS: Decryption success.");
    } catch(e) {
        console.error("FAIL: Decryption failed.", e);
        // @ts-ignore
        console.error(e.message);
    }
}

test();
