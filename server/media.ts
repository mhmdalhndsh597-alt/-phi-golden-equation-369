import { storagePut } from "./storage";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type ImageSignature = { mime: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; extension: "jpg" | "png" | "webp" | "gif" };

function detectImageSignature(buffer: Buffer): ImageSignature | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mime: "image/jpeg", extension: "jpg" };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { mime: "image/png", extension: "png" };
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return { mime: "image/webp", extension: "webp" };
  if (buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))) return { mime: "image/gif", extension: "gif" };
  return null;
}

export async function uploadVerifiedImage(userId: number, base64Data: string) {
  const clean = base64Data.replace(/^data:[^;]+;base64,/, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(clean)) throw new Error("Invalid image encoding");
  const buffer = Buffer.from(clean, "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new Error("Image must be between 1 byte and 5 MB");
  const signature = detectImageSignature(buffer);
  if (!signature) throw new Error("Only valid JPEG, PNG, WebP, or GIF images are allowed");
  const uploaded = await storagePut(`users/${userId}/posts/${crypto.randomUUID()}.${signature.extension}`, buffer, signature.mime);
  return { ...uploaded, mime: signature.mime };
}
