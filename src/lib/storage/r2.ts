import "server-only";
import { AwsClient } from "aws4fetch";

// Product photos and videos live in Cloudflare R2 (free tier), never in the
// database. The admin (next phase) asks the server for a short-lived signed
// upload URL, the browser PUTs the file straight to R2, and the public URL
// is saved in product_media. R2 speaks the S3 API, so moving to another S3
// store later only means changing the env vars.

const UPLOAD_TTL_SECONDS = 600;

const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

function r2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) return null;
  return {
    endpoint: `https://${accountId}.r2.cloudflarestorage.com/${bucket}`,
    publicUrl: publicUrl.replace(/\/$/, ""),
    client: new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" }),
  };
}

export function isR2Configured(): boolean {
  return r2Config() !== null;
}

export type UploadTarget = {
  /** PUT the file here, with the same Content-Type. Valid 10 minutes. */
  uploadUrl: string;
  /** Where the file will be served from: store this in product_media.url. */
  publicUrl: string;
  key: string;
};

/**
 * Signed URL for uploading one file to R2, e.g.
 * createUploadUrl({ folder: "products/cursive-name-necklace", contentType: "image/webp" }).
 * Call only after checking the caller's staff permission.
 */
export async function createUploadUrl({
  folder,
  contentType,
}: {
  folder: string;
  contentType: string;
}): Promise<UploadTarget> {
  const r2 = r2Config();
  if (!r2) throw new Error("R2 is not configured (see .env.example).");
  const ext = allowedTypes[contentType];
  if (!ext) throw new Error(`Unsupported file type: ${contentType}`);
  const safeFolder = folder.replace(/[^a-z0-9/-]/gi, "").replace(/^\/+|\/+$/g, "");
  const key = `${safeFolder}/${crypto.randomUUID()}.${ext}`;

  const url = new URL(`${r2.endpoint}/${key}`);
  url.searchParams.set("X-Amz-Expires", String(UPLOAD_TTL_SECONDS));
  const signed = await r2.client.sign(
    new Request(url, { method: "PUT", headers: { "Content-Type": contentType } }),
    { aws: { signQuery: true } },
  );
  return { uploadUrl: signed.url, publicUrl: `${r2.publicUrl}/${key}`, key };
}

/** Deletes a file (when a photo is removed in the admin). */
export async function deleteObject(key: string): Promise<void> {
  const r2 = r2Config();
  if (!r2) throw new Error("R2 is not configured (see .env.example).");
  const res = await r2.client.fetch(`${r2.endpoint}/${key}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed: ${res.status}`);
}
