import React from "react";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";

type Props = {
  width: number;
  height: number;
  cellSize?: number;
  light?: string;
  dark?: string;
};

/**
 * Standard image-editor "transparency" checkerboard. Used in previews where
 * we want to visually indicate that the rendered surface is transparent.
 * Not captured into the share PNG — keep it outside the captureRef target.
 */
export function Checkerboard({
  width,
  height,
  cellSize = 12,
  light = "#ffffff",
  dark = "#cccccc",
}: Props) {
  const tile = cellSize * 2;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <Pattern
          id="checker"
          width={tile}
          height={tile}
          patternUnits="userSpaceOnUse"
        >
          <Rect x={0} y={0} width={tile} height={tile} fill={light} />
          <Rect x={0} y={0} width={cellSize} height={cellSize} fill={dark} />
          <Rect
            x={cellSize}
            y={cellSize}
            width={cellSize}
            height={cellSize}
            fill={dark}
          />
        </Pattern>
      </Defs>
      <Rect width={width} height={height} fill="url(#checker)" />
    </Svg>
  );
}
