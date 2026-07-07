// ============================================================
// util/imagekit.util.js — ImageKit cloud storage
// E njëjta strukturë si social_media_app
// ============================================================
import ImageKit from "imagekit";
import dotenv from "dotenv";
dotenv.config();

export const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
});

/**
 * Upload buffer/base64 në ImageKit
 * @param {Buffer|string} fileBuffer
 * @param {string} fileName
 * @param {string} folder - "avatars" | "inventory" | "products"
 */
export async function uploadImage(fileBuffer, fileName, folder = "smart-kitchen") {
  const result = await imagekit.upload({
    file: fileBuffer,
    fileName: fileName,
    folder: `/${folder}`,
    useUniqueFileName: true,
  });
  return { url: result.url, fileId: result.fileId };
}

export async function deleteImage(fileId) {
  if (!fileId) return;
  await imagekit.deleteFile(fileId).catch(() => {});
}
