export function encode(s: string) {
  return Buffer.from(s, 'utf-8').toString('base64');
}

export function decode(s: string) {
  return Buffer.from(s, 'base64').toString('utf-8');
}
