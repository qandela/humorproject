"use client";

import { useActionState } from "react";
import { saveProfile, type ProfileState } from "./actions";

export function ProfileForm({ firstName, lastName }: { firstName: string | null; lastName: string | null }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});
  return <form action={action} className="profile-form">
    <div className="name-fields">
      <label htmlFor="first_name">First name
        <input id="first_name" name="first_name" autoComplete="given-name" maxLength={80} defaultValue={firstName ?? ""} />
      </label>
      <label htmlFor="last_name">Last name
        <input id="last_name" name="last_name" autoComplete="family-name" maxLength={80} defaultValue={lastName ?? ""} />
      </label>
    </div>
    <label htmlFor="photo">Profile photo
      <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="photo-help" />
    </label>
    <p id="photo-help" className="field-help">JPEG, PNG, or WebP, up to 2 MB. Leave blank to keep your current photo.</p>
    {state.error && <p className="form-message" role="alert">{state.error}</p>}
    {state.success && <p className="form-message" role="status">{state.success}</p>}
    <button className="button" type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
  </form>;
}
