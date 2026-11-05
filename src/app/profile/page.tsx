import { Suspense } from "react";
import Image from "next/image";
import { requireUser } from "@/lib/auth";
import { ProfileForm } from "./profile-form";

export default function ProfilePage(props: PageProps<"/profile">) {
  return <main className="account-page"><Suspense fallback={<p role="status">Loading your profile…</p>}>
    <ProfileContent searchParams={props.searchParams} />
  </Suspense></main>;
}

async function ProfileContent({ searchParams }: Pick<PageProps<"/profile">, "searchParams">) {
  const { supabase, user } = await requireUser();
  const params = await searchParams;
  const { data: profile, error } = await supabase.from("profiles")
    .select("first_name,last_name,avatar_path").eq("id", user.id).maybeSingle();
  let avatarUrl: string | undefined;
  if (profile?.avatar_path?.startsWith(`${user.id}/`)) {
    const { data } = await supabase.storage.from("avatars").createSignedUrl(profile.avatar_path, 3600);
    avatarUrl = data?.signedUrl;
  }

  return <section className="account-panel">
    <p className="eyebrow">Your corner of the collection</p>
    <h1>Make it yours.</h1>
    <p>Update your name and add a photo. Your names are optional.</p>
    {params.error === "signout" && <p className="form-message" role="alert">Sign-out did not complete. Please try again.</p>}
    <div className="profile-identity">
      {avatarUrl ? <Image src={avatarUrl} alt="Your profile photo" width={96} height={96} unoptimized className="avatar" /> :
        <div className="avatar avatar-placeholder" aria-label="No profile photo">{(profile?.first_name?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}</div>}
      <p>{user.email}</p>
    </div>
    {error ? <p className="form-message" role="alert">Your profile could not be loaded. Please try again shortly.</p> :
      <ProfileForm firstName={profile?.first_name ?? null} lastName={profile?.last_name ?? null} />}
  </section>;
}
