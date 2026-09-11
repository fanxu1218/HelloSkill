// Shared Web Crypto format for the local packer and browser. No secrets here.
export const VAULT_VERSION = 1;
export const VAULT_ITERATIONS = 600000;
export const MAX_VAULT_BYTES = 48 * 1024 * 1024;
const encoder = new TextEncoder();
const context = encoder.encode("SkillDock private vault v1");

export function toBase64(bytes) {
  let text = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    text += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(text);
}

export function fromBase64(text) {
  if (typeof text !== "string" || text.length > MAX_VAULT_BYTES * 1.4) throw new Error("无效的加密文件。");
  return Uint8Array.from(atob(text), (character) => character.charCodeAt(0));
}

async function deriveKey(password, accessKey, salt, usage) {
  if (typeof password !== "string" || !password || !/^[A-Za-z0-9_-]{43}$/.test(accessKey)) {
    throw new Error("密码或私人链接不完整。");
  }
  if (!globalThis.crypto?.subtle) throw new Error("请使用支持加密的浏览器并通过 HTTPS 打开。");
  const material = await crypto.subtle.importKey("raw", encoder.encode(`${accessKey}\0${password}`), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: VAULT_ITERATIONS },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

export async function encryptVault(payload, password, accessKey) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(payload));
  if (plaintext.length > MAX_VAULT_BYTES) throw new Error("私人区超过 48 MiB，请减少文件体积后重试。");
  const key = await deriveKey(password, accessKey, salt, "encrypt");
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: context, tagLength: 128 }, key, plaintext);
  return { version: VAULT_VERSION, algorithm: "AES-256-GCM", kdf: "PBKDF2-SHA-256", iterations: VAULT_ITERATIONS, salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
}

export async function decryptVault(envelope, password, accessKey) {
  if (envelope?.version !== VAULT_VERSION || envelope.algorithm !== "AES-256-GCM" || envelope.kdf !== "PBKDF2-SHA-256" || envelope.iterations !== VAULT_ITERATIONS) {
    throw new Error("加密文件格式不受支持，请重新生成私人区。");
  }
  const salt = fromBase64(envelope.salt);
  const iv = fromBase64(envelope.iv);
  const ciphertext = fromBase64(envelope.ciphertext);
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16 || ciphertext.length > MAX_VAULT_BYTES + 16) throw new Error("加密文件不完整。");
  const key = await deriveKey(password, accessKey, salt, "decrypt");
  let plaintext;
  try {
    plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: context, tagLength: 128 }, key, ciphertext);
  } catch {
    throw new Error("解锁失败：密码或私人链接不正确，也可能是文件已损坏。");
  }
  const payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plaintext));
  if (payload?.version !== 1 || !Array.isArray(payload.skills) || payload.skills.some((skill) =>
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(skill.id) || typeof skill.name !== "string" || typeof skill.markdown !== "string" || typeof skill.archive !== "string" || !Array.isArray(skill.files)
  )) throw new Error("私人区内容格式不正确。");
  return payload;
}

export function parsePrivateRoute(hash) {
  const match = /^#\/just-me\/([a-f0-9]{32})\/([A-Za-z0-9_-]{43})$/.exec(hash);
  return match ? { id: match[1], accessKey: match[2] } : null;
}
