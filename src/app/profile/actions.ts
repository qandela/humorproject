"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { parseProfileNames, validatePhoto } from "@/lib/profile";

export type ProfileState = { error?: string; success?: string };

export async function saveProfile(_previous: ProfileState, formData: FormData): Promise<ProfileState> {
  const { supabase, user } = await requireUser();
  const names = parseProfileNames(formData);
  if ("error" in names) return { error: names.error };

  const photo = formData.get("photo");
  let upload: { file: File; extension: string; contentType: string } | null = null;
  if (photo instanceof File && photo.size > 0) {
    const result = await validatePhoto(photo);
    if ("error" in result) return { error: result.error };
    upload = { file: photo, ...result };
  }

  const { data: existing, error: readError } = await supabase
    .from("profiles").select("avatar_path").eq("id", user.id).maybeSingle();
  if (readError) return { error: "Your profile could not be loaded. Please try again shortly." };

  let avatarPath: string | null = existing?.avatar_path ?? null;
  if (upload) {
    avatarPath = `${user.id}/${randomUUID()}.${upload.extension}`;
    const { error } = await supabase.storage.from("avatars").upload(avatarPath, upload.file, {
      contentType: upload.contentType,
      upsert: false,
    });
    if (error) return { error: "Your photo could not be uploaded. Please try again shortly." };
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    first_name: names.firstName,
    last_name: names.lastName,
    avatar_path: avatarPath,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    if (upload && avatarPath) await supabase.storage.from("avatars").remove([avatarPath]);
    return { error: "Your profile could not be saved. Please try again shortly." };
  }

  const previousPath = existing?.avatar_path;
  if (upload && previousPath?.startsWith(`${user.id}/`) && previousPath !== avatarPath) {
    await supabase.storage.from("avatars").remove([previousPath]);
  }
  revalidatePath("/profile");
  return { success: "Your profile has been saved." };
}
