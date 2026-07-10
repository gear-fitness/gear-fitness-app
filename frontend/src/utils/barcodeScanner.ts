// Bridge between the in-app BarcodeScannerScreen and its consumers, mirroring
// utils/inAppCamera. Consumers call openBarcodeScanner() and await the scanned
// code; the screen reports back through resolveBarcode(). A module-level
// pending request (rather than route params) keeps callbacks out of navigation
// state, which react-navigation warns against.
//
// Resolves with the raw scanned code value (digits, e.g. an EAN-13 or UPC-A),
// or null if the user closes the scanner without scanning anything.

type PendingRequest = {
  resolve: (code: string | null) => void;
};

let pending: PendingRequest | null = null;

export function openBarcodeScanner(navigation: {
  navigate: (screen: "BarcodeScanner") => void;
}): Promise<string | null> {
  // A stale request can only exist if a previous scanner screen died without
  // resolving; settle it so its caller isn't left hanging forever.
  pending?.resolve(null);
  return new Promise((resolve) => {
    pending = { resolve };
    navigation.navigate("BarcodeScanner");
  });
}

export function resolveBarcode(code: string | null) {
  const request = pending;
  pending = null;
  request?.resolve(code);
}
