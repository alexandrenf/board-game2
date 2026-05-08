const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const ALPHABET_SIZE = ALPHABET.length;

/**
 * Returns a small URL-safe random ID.
 *
 * Prefers the platform's CSPRNG (`crypto.getRandomValues`) when available
 * to avoid the bias and predictability of `Math.random`. Falls back to
 * `Math.random` only on environments lacking Web Crypto (older RN runtimes).
 *
 * To eliminate modulo bias the byte rejection threshold is the largest
 * multiple of {@link ALPHABET_SIZE} less than 256.
 */
export const nanoid = (size: number = 21): string => {
  let result = '';

  type CryptoLike = { getRandomValues: (array: Uint8Array) => Uint8Array };
  const cryptoRef: CryptoLike | undefined =
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { crypto?: CryptoLike }).crypto?.getRandomValues === 'function'
      ? (globalThis as { crypto: CryptoLike }).crypto
      : undefined;

  if (cryptoRef) {
    // 252 = floor(256 / 36) * 36; bytes >= 252 are rejected to avoid bias.
    const threshold = Math.floor(256 / ALPHABET_SIZE) * ALPHABET_SIZE;
    // Over-allocate so the rejection loop rarely needs to refill.
    const buffer = new Uint8Array(size + Math.ceil(size / 4));
    while (result.length < size) {
      cryptoRef.getRandomValues(buffer);
      for (let i = 0; i < buffer.length && result.length < size; i += 1) {
        const byte = buffer[i]!;
        if (byte < threshold) {
          result += ALPHABET[byte % ALPHABET_SIZE];
        }
      }
    }
    return result;
  }

  for (let index = 0; index < size; index += 1) {
    const random = Math.floor(Math.random() * ALPHABET_SIZE);
    result += ALPHABET[random];
  }

  return result;
};
