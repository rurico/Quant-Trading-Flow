export function nanoid(size = 10): string {
  const S = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return [...new Array(size)].map(() => S[Math.floor(Math.random() * S.length)]).join("");
}
