export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const MAX_NAME_LENGTH = 80;

export function parseProfileNames(formData: FormData) {
  const first = formData.get("first_name");
  const last = formData.get("last_name");
  if (typeof first !== "string" || typeof last !== "string") {
    return { error: "Please enter valid names." } as const;
  }
  const firstName = first.trim() || null;
  const lastName = last.trim() || null;
  if ((firstName?.length ?? 0) > MAX_NAME_LENGTH || (lastName?.length ?? 0) > MAX_NAME_LENGTH) {
    return { error: "Please keep each name to 80 characters or fewer." } as const;
  }
  return { firstName, lastName } as const;
}

export async function validatePhoto(file: File) {
  if (file.size > MAX_PHOTO_BYTES) return { error: "Please choose a photo smaller than 2 MB." } as const;
  if (!file.size) return { error: "The photo is empty. Please choose another file." } as const;
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = [137, 80, 78, 71, 13, 10, 26, 10];
  if (file.type === "image/png" && png.every((value, index) => bytes[index] === value)) {
    return { extension: "png", contentType: "image/png" } as const;
  }
  if (file.type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    return { extension: "jpg", contentType: "image/jpeg" } as const;
  }
  const text = new TextDecoder().decode(bytes);
  if (file.type === "image/webp" && text.startsWith("RIFF") && text.slice(8, 12) === "WEBP") {
    return { extension: "webp", contentType: "image/webp" } as const;
  }
  return { error: "Please upload a JPEG, PNG, or WebP photo." } as const;
}
