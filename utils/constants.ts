
export const SIG_BITS = 16;
export const SALT_BITS = 128;
export const IV_BITS = 96;
export const LENGTH_BITS = 32;

export const SEQUENTIAL_BITS = SIG_BITS + SALT_BITS;
export const SCATTERED_METADATA_BITS = IV_BITS + LENGTH_BITS;

// 240 bits ~ 30 bytes safety margin for GZIP header/footer overhead
export const GZIP_MARGIN_BITS = 240;

// Total overhead bits reserved in capacity calculation
export const TOTAL_OVERHEAD_BITS = SEQUENTIAL_BITS + SCATTERED_METADATA_BITS + GZIP_MARGIN_BITS;

export const ENCRYPTION_AAD = "DontSee_v1";
