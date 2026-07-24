import { ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";

// Small chain-link glyph shared by every superset surface (summary block
// header, detail caption, partner chip, partner sheet rows). Stroke-only so
// it inherits whatever tone the host screen's theme passes in.
export function SupersetLinkIcon({
  size = 13,
  color,
  strokeWidth = 2,
}: {
  size?: number;
  color: ColorValue;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
