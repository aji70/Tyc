/**
 * Convert a short string to a single felt (for Dojo/Starknet contract calls).
 * For strings longer than 31 chars, returns an array of felts.
 */
export function stringToFelt(str: string): bigint | bigint[] {
  if (str.length <= 31) {
    const hexString = str
      .split('')
      .reduce((memo, c) => memo + c.charCodeAt(0).toString(16), '');
    return BigInt('0x' + hexString);
  }
  const size = Math.ceil(str.length / 31);
  const arr: bigint[] = [];
  let offset = 0;
  for (let i = 0; i < size; i++) {
    const substr = str.substring(offset, offset + 31).split('');
    const ss = substr.reduce(
      (memo, c) => memo + c.charCodeAt(0).toString(16),
      ''
    );
    arr.push(BigInt('0x' + ss));
    offset += 31;
  }
  return arr;
}
