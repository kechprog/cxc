// TODO: Replace with DB when schema is finalized.
// In-memory store survives between API calls within a single dev server session.
// No persistence between restarts.

let profileId: string | null = null;

export function getProfileId(): string | null {
  return profileId;
}

export function setProfileId(id: string): void {
  profileId = id;
}
