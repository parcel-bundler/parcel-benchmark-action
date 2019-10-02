export function encode(s: string) {
  return new Buffer(s, "utf-8").toString("base64");
}

export function decode(s: string) {
  return new Buffer(s, "base64").toString("utf-8");
}
