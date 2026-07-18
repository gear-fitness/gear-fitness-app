// One-shot signal distinguishing an explicit, user-initiated logout from a
// forced one (token refresh definitively rejected). WorkoutTimerProvider
// watches the authenticated-to-unauthenticated transition and must react
// differently: an explicit logout tears the in-progress workout down, while
// a session expiry preserves it so the same user gets it back on re-login.
// AuthContext cannot tell the provider directly (the provider imports
// AuthContext, so the reverse import would be a cycle); this tiny module is
// the go-between.
let explicitLogout = false;

export function markExplicitLogout(): void {
  explicitLogout = true;
}

export function consumeExplicitLogout(): boolean {
  const value = explicitLogout;
  explicitLogout = false;
  return value;
}
