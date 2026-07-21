import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { flush, identifyUser, resetIdentity } from "./client";

export function AnalyticsIdentitySync() {
  const { user, isLoading } = useAuth();
  const wasIdentified = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (user?.userId) {
      identifyUser(user);
      wasIdentified.current = true;
    } else if (wasIdentified.current) {
      wasIdentified.current = false;
      (async () => {
        await flush();
        resetIdentity();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, user?.tier, isLoading]);

  return null;
}
