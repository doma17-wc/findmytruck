"use client";

export interface ResizedImage {
  blob: Blob;
  ext: string;
  contentType: string;
}

const PASSTHROUGH = new Set(["image/gif", "image/svg+xml"]);

/**
 * Downscale an image to at most `maxWidth` px wide and re-encode it (webp, then
 * jpeg fallback) to keep uploads small. Falls back to the original file whenever
 * the browser can't decode/encode it (old Safari, animated gifs, SVG…).
 */
export async function resizeImage(file: File, maxWidth = 1600, quality = 0.82): Promise<ResizedImage> {
  const fallback: ResizedImage = {
    blob: file,
    ext: (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg",
    contentType: file.type || "application/octet-stream",
  };

  if (!file.type.startsWith("image/") || PASSTHROUGH.has(file.type)) return fallback;
  if (typeof createImageBitmap !== "function") return fallback;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return fallback;
  }

  try {
    const scale = Math.min(1, maxWidth / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fallback;
    ctx.drawImage(bitmap, 0, 0, width, height);

    for (const type of ["image/webp", "image/jpeg"] as const) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
      if (blob && blob.size > 0) {
        // If re-encoding somehow made it bigger and no resize happened, keep original.
        if (scale === 1 && blob.size >= file.size) return fallback;
        return { blob, ext: type === "image/webp" ? "webp" : "jpg", contentType: type };
      }
    }
    return fallback;
  } finally {
    bitmap.close();
  }
}
