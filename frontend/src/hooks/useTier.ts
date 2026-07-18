import { useMemo } from "react";
import { usePurchases, PLUS_ENTITLEMENT } from "../context/PurchasesContext";
import { useAuth } from "../context/AuthContext";

export type Tier = "BASIC" | "PLUS";

const RANK: Record<Tier, number> = { BASIC: 0, PLUS: 1 };

const ENTITLEMENT_TO_TIER: Record<string, Tier> = {
  [PLUS_ENTITLEMENT]: "PLUS",
};

/**
 * Resolve the user's tier. Primary source is the RevenueCat client entitlement
 * (instant after purchase); the backend `UserProfile.tier` is the fallback when
 * the SDK isn't ready yet. Gate features with `atLeast("plus")`, never equality.
 */
export function useTier() {
  const { customerInfo } = usePurchases();
  const { user } = useAuth();

  return useMemo(() => {
    let tier: Tier = "BASIC";

    const active = customerInfo?.entitlements?.active ?? {};
    for (const id of Object.keys(active)) {
      const mapped = ENTITLEMENT_TO_TIER[id];
      if (mapped && RANK[mapped] > RANK[tier]) tier = mapped;
    }

    const backendTier = user?.tier;
    if (backendTier && RANK[backendTier] > RANK[tier]) tier = backendTier;

    return {
      tier,
      atLeast: (min: Tier) => RANK[tier] >= RANK[min],
    };
  }, [customerInfo, user]);
}
