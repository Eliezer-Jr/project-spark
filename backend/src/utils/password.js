import crypto from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, originalHash] = storedHash.split(":");
  if (!salt || !originalHash) return false;

  const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(originalHash, "hex"), Buffer.from(derivedKey, "hex"));
}
