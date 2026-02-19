const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

export const nanoid = (size: number = 21): string => {
  let result = '';

  for (let index = 0; index < size; index += 1) {
    const random = Math.floor(Math.random() * ALPHABET.length);
    result += ALPHABET[random];
  }

  return result;
};
