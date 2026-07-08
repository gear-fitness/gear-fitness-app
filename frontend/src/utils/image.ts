import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

// Center-crops an image to a square. Camera captures are full-frame, so the
// profile-picture flow needs this to match the 1:1 crop the library picker's
// allowsEditing step produces. Returns the original URI if the image is
// already square or if sizing fails.
export async function cropImageToSquare(uri: string): Promise<string> {
  try {
    const { width, height } = await getImageSize(uri);
    if (width === height) return uri;
    const side = Math.min(width, height);
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          crop: {
            originX: Math.floor((width - side) / 2),
            originY: Math.floor((height - side) / 2),
            width: side,
            height: side,
          },
        },
      ],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
    );
    return result.uri;
  } catch {
    return uri;
  }
}
