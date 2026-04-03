/** Remote brand assets for Google / Apple sign-in UI (onboarding). */
export const GOOGLE_LOGO_URI =
  "https://www.gstatic.com/marketing-cms/assets/images/d5/dc/cfe9ce8b4425b410b49b7f2dd3f3/g.webp=s96-fcrop64=1,00000000ffffffff-rw";

const APPLE_LOGO_DARK_UI =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/1280px-Apple_logo_black.svg.png";

const APPLE_LOGO_LIGHT_UI =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Apple_logo_white.svg/1280px-Apple_logo_white.svg.png?_=20220821122232";

/** Apple logo tuned for `useColorScheme() === "dark"` / theme `isDark`. */
export function appleBrandLogoUri(isDark: boolean): string {
  return isDark ? APPLE_LOGO_DARK_UI : APPLE_LOGO_LIGHT_UI;
}
