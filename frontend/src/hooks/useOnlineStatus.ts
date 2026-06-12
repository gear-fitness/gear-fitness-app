import { useEffect, useState } from "react";
import { isOnline, subscribeOnlineStatus } from "../utils/network";

/**
 * Subscribe to the global network status singleton and re-render when it
 * flips. Returns the current online flag.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnlineState] = useState<boolean>(() => isOnline());

  useEffect(() => {
    setOnlineState(isOnline());
    return subscribeOnlineStatus((next) => setOnlineState(next));
  }, []);

  return online;
}
