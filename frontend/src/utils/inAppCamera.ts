import * as ImagePicker from "expo-image-picker";

// Bridge between the in-app CameraScreen and its consumers. Consumers call
// openCamera() and await the result; the screen reports back through
// resolveCamera(). A module-level pending request (rather than route params)
// keeps callbacks out of navigation state, which react-navigation warns
// against, and lets any screen consume the camera with one await.
//
// The camera resolves with local image URIs plus their source: a single-entry
// "capture" for a photo taken in the camera, a "library" result (possibly
// several URIs) when the user leaves via the screen's photo-library shortcut,
// or null if they close without choosing anything. The source lets consumers
// treat fresh captures specially (e.g. save-to-library on post) without
// re-saving photos that already live in the user's library.

export type CameraLibraryOptions = Pick<
  ImagePicker.ImagePickerOptions,
  | "allowsMultipleSelection"
  | "selectionLimit"
  | "allowsEditing"
  | "aspect"
  | "quality"
>;

export type CameraResult = {
  uris: string[];
  source: "capture" | "library";
};

type PendingRequest = {
  library?: CameraLibraryOptions;
  resolve: (result: CameraResult | null) => void;
};

let pending: PendingRequest | null = null;

export function openCamera(
  navigation: { navigate: (screen: "Camera") => void },
  options?: { library?: CameraLibraryOptions },
): Promise<CameraResult | null> {
  // A stale request can only exist if a previous camera screen died without
  // resolving; settle it so its caller isn't left hanging forever.
  pending?.resolve(null);
  return new Promise((resolve) => {
    pending = { library: options?.library, resolve };
    navigation.navigate("Camera");
  });
}

// Options the consumer wants applied if the user picks from the library
// shortcut inside the camera (e.g. multi-select limits, square editing).
export function getCameraLibraryOptions(): CameraLibraryOptions | undefined {
  return pending?.library;
}

export function resolveCamera(result: CameraResult | null) {
  const request = pending;
  pending = null;
  request?.resolve(result);
}
