import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";
import { useAuth } from "./AuthContext";

/** RevenueCat entitlement identifier for the paid "Plus" tier. */
export const PLUS_ENTITLEMENT = "plus";

interface PurchasesContextType {
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  isReady: boolean;
  /**
   * Whether THIS Apple ID is still eligible for the intro free trial. Apple
   * grants a trial only once per subscription group, so a user who already
   * used it is ineligible — Apple silently drops the trial and charges
   * immediately at purchase. We default to `false` and only flip to `true`
   * once RevenueCat confirms eligibility, so the UI never promises a trial
   * the user won't actually get (RevenueCat's own guidance for unknown status).
   */
  trialEligible: boolean;
  purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
  restore: () => Promise<CustomerInfo>;
  refreshCustomerInfo: () => Promise<void>;
}

const PurchasesContext = createContext<PurchasesContextType | undefined>(
  undefined,
);

// Configure the SDK exactly once per JS runtime, regardless of remounts.
let configured = false;

export function PurchasesProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] =
    useState<PurchasesOffering | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [trialEligible, setTrialEligible] = useState(false);

  // Configure once on mount (iOS only for now).
  useEffect(() => {
    if (configured || Platform.OS !== "ios") {
      setIsReady(true);
      return;
    }
    const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
    if (!apiKey) {
      console.warn("RevenueCat: EXPO_PUBLIC_REVENUECAT_IOS_KEY is not set");
      setIsReady(true);
      return;
    }

    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    configured = true;

    const listener = (info: CustomerInfo) => setCustomerInfo(info);
    Purchases.addCustomerInfoUpdateListener(listener);

    (async () => {
      try {
        const offerings = await Purchases.getOfferings();
        setCurrentOffering(offerings.current);
        setCustomerInfo(await Purchases.getCustomerInfo());

        // Check intro-trial eligibility for this Apple ID. All packages share
        // one subscription group, so eligibility is the same across them — any
        // ELIGIBLE means the trial will actually apply at purchase.
        const ids = (offerings.current?.availablePackages ?? []).map(
          (p) => p.product.identifier,
        );
        if (ids.length) {
          const elig =
            await Purchases.checkTrialOrIntroductoryPriceEligibility(ids);
          const ELIGIBLE =
            Purchases.INTRO_ELIGIBILITY_STATUS
              .INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
          setTrialEligible(
            Object.values(elig).some((e) => e.status === ELIGIBLE),
          );
        }
      } catch (e) {
        console.warn("RevenueCat: failed to load offerings/customerInfo", e);
      } finally {
        setIsReady(true);
      }
    })();

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  // Keep the RevenueCat identity in sync with the authenticated user so that
  // app_user_id == AppUser.userId (what the backend webhook maps on).
  useEffect(() => {
    if (!configured) return;
    (async () => {
      try {
        if (user?.userId) {
          const { customerInfo: ci } = await Purchases.logIn(user.userId);
          setCustomerInfo(ci);
        } else {
          // Already anonymous → logOut throws; ignore that case.
          const ci = await Purchases.logOut();
          setCustomerInfo(ci);
        }
      } catch {
        // Identity sync is best-effort; the update listener will catch up.
      }
    })();
  }, [user?.userId]);

  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage) => {
      const { customerInfo: ci } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(ci);
      // Pull the authoritative tier once the webhook has likely landed. The
      // client entitlement already gates the UI instantly, so this is best
      // effort and never blocks the purchase result.
      refreshUser().catch(() => {});
    },
    [refreshUser],
  );

  const restore = useCallback(async () => {
    const ci = await Purchases.restorePurchases();
    setCustomerInfo(ci);
    refreshUser().catch(() => {});
    return ci;
  }, [refreshUser]);

  const refreshCustomerInfo = useCallback(async () => {
    if (!configured) return;
    setCustomerInfo(await Purchases.getCustomerInfo());
  }, []);

  return (
    <PurchasesContext.Provider
      value={{
        customerInfo,
        currentOffering,
        isReady,
        trialEligible,
        purchasePackage,
        restore,
        refreshCustomerInfo,
      }}
    >
      {children}
    </PurchasesContext.Provider>
  );
}

export function usePurchases() {
  const ctx = useContext(PurchasesContext);
  if (!ctx) {
    throw new Error("usePurchases must be used within a PurchasesProvider");
  }
  return ctx;
}
