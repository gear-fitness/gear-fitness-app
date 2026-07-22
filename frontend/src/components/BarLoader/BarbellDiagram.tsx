import React from "react";
import { useColorScheme } from "react-native";
import Svg, { G, Rect, Text as SvgText } from "react-native-svg";
import {
  StackPlate,
  formatNumber,
  plateColor,
  unitDisplay,
} from "../../utils/plateMath";

type Props = {
  /**
   * One side's plates as an ordered stack, bottom first: the first entry
   * renders leftmost against the collar and each later plate stacks to
   * the right along the sleeve, so newly loaded plates land on the right
   * end. Plates carry their own unit, so kg and lb plates can share the
   * bar.
   */
  plates: StackPlate[];
  barWeight: number;
  collarPerSide: number;
  width: number;
  height?: number;
};

// Per-denomination render geometry: height as a fraction of the tallest
// plate, width in base px (scaled down together when a heavy load would
// overflow the sleeve area).
const KG_GEOMETRY: Record<number, { h: number; w: number }> = {
  50: { h: 1, w: 26 },
  25: { h: 1, w: 17 },
  20: { h: 1, w: 13 },
  15: { h: 0.84, w: 11 },
  10: { h: 0.72, w: 10 },
  5: { h: 0.56, w: 9 },
  2.5: { h: 0.46, w: 8 },
  2: { h: 0.42, w: 7 },
  1.5: { h: 0.4, w: 7 },
  1.25: { h: 0.37, w: 6 },
  1: { h: 0.34, w: 6 },
  0.5: { h: 0.3, w: 5 },
};

const LB_GEOMETRY: Record<number, { h: number; w: number }> = {
  55: { h: 1, w: 20 },
  45: { h: 1, w: 15 },
  35: { h: 0.85, w: 13 },
  25: { h: 0.7, w: 11 },
  10: { h: 0.55, w: 8 },
  5: { h: 0.45, w: 8 },
  2.5: { h: 0.4, w: 7 },
  1.25: { h: 0.33, w: 5 },
};

const FALLBACK_GEOMETRY = { h: 0.4, w: 7 };
const PLATE_RX = 2.5;

// Where the collar starts (the visible shaft length). Exported so the
// share card can center content on the loaded span (collar through
// sleeve end) rather than the full bar including the shaft.
export const COLLAR_X = 20;

function geometryFor(plate: StackPlate): { h: number; w: number } {
  const map = plate.unit === "kg" ? KG_GEOMETRY : LB_GEOMETRY;
  return map[plate.denom] ?? FALLBACK_GEOMETRY;
}

export function BarbellDiagram({
  plates,
  barWeight,
  collarPerSide,
  width,
  height = 150,
}: Props) {
  const isDark = useColorScheme() === "dark";
  const barColor = isDark ? "#6C6C70" : "#AEAEB2";
  const collarBg = isDark ? "#48484A" : "#8E8E93";
  // Thin outline separating flush plates (two touching reds stay legible).
  const plateOutline = isDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.9)";

  const centerY = height / 2;
  const maxPlateH = height * 0.94;

  // One side of the bar: the sleeve spans the full width with the taller
  // rounded collar (carrying the bar-weight label) overlapping it near the
  // left end; plates load onto the sleeve to the collar's right.
  const sleeveH = height * 0.1;
  // Shaft protruding left of the collar: a smaller diameter than the
  // sleeve, like a real bar's grip section.
  const shaftH = sleeveH * 0.6;
  const collarX = COLLAR_X;
  const collarW = 26;
  // The collar is part of the barbell, so its height tracks the sleeve's.
  const collarH = sleeveH * 1.8;
  const clampW = collarPerSide > 0 ? 8 : 0;

  // Plates keep their natural width and simply extend rightward along
  // the bar as the load grows; an extreme load clips at the right edge.

  // Plates sit flush: no gap between the collar and the first plate, none
  // between neighbors.
  let cursor = collarX + collarW;

  // Bottom of the stack leftmost, each later plate to the right.
  const drawn = plates.map((p) => {
    const geo = geometryFor(p);
    const w = geo.w;
    const h = geo.h * maxPlateH;
    const x = cursor;
    cursor += w;
    return { plate: p, x, w, h };
  });

  // The clamp collar secures the stack from outside, so it sits on top
  // (rightmost).
  const clampX = cursor;

  return (
    <Svg width={width} height={height}>
      {/* Shaft, left of the collar */}
      <Rect
        x={0}
        y={centerY - shaftH / 2}
        width={collarX + 4}
        height={shaftH}
        rx={3}
        fill={barColor}
      />
      {/* Sleeve, from the collar to the right edge */}
      <Rect
        x={collarX}
        y={centerY - sleeveH / 2}
        width={width - collarX}
        height={sleeveH}
        rx={6}
        fill={barColor}
      />
      {/* Collar, overlapping the sleeve and carrying the bar weight */}
      <G>
        <Rect
          x={collarX}
          y={centerY - collarH / 2}
          width={collarW}
          height={collarH}
          rx={6}
          fill={collarBg}
        />
        <SvgText
          x={collarX + collarW / 2}
          y={centerY + 3.5}
          fontSize={10}
          fontWeight="700"
          fill="#fff"
          textAnchor="middle"
        >
          {formatNumber(barWeight)}
        </SvgText>
      </G>
      {/* Plates */}
      {drawn.map(({ plate, x, w, h }, i) => {
        const color = plateColor(plate.denom, plate.unit);
        const label = formatNumber(plate.denom);
        // Numbers read horizontally on big plates; below 15 the plates get
        // too thin, so the digits stack into an upright column instead.
        const stacked = plate.denom < 15;
        const chars = label.split("");
        const charH = 9;
        const showLabel = stacked ? h > chars.length * charH + 8 : h > 26;
        const firstCharY = centerY - ((chars.length - 1) * charH) / 2 + 3;
        const unitLabel = unitDisplay(plate.unit);
        return (
          <G key={`${plate.unit}-${plate.denom}-${i}`}>
            <Rect
              x={x}
              y={centerY - h / 2}
              width={w}
              height={h}
              rx={PLATE_RX}
              fill={color.bg}
              stroke={plateOutline}
              strokeWidth={1}
            />
            {showLabel &&
              (stacked ? (
                chars.map((ch, ci) => (
                  <SvgText
                    key={ci}
                    x={x + w / 2}
                    y={firstCharY + ci * charH}
                    fontSize={9}
                    fontWeight="700"
                    fill="#fff"
                    stroke="rgba(0,0,0,0.55)"
                    strokeWidth={0.5}
                    textAnchor="middle"
                  >
                    {ch}
                  </SvgText>
                ))
              ) : (
                <SvgText
                  x={x + w / 2}
                  y={centerY + 3.5}
                  fontSize={9}
                  fontWeight="700"
                  fill="#fff"
                  stroke="rgba(0,0,0,0.55)"
                  strokeWidth={0.5}
                  textAnchor="middle"
                >
                  {label}
                </SvgText>
              ))}
            {stacked ? (
              unitLabel.split("").map((ch, ci, arr) => (
                <SvgText
                  key={`u${ci}`}
                  x={x + w / 2}
                  y={centerY + h / 2 - 8 - (arr.length - 1 - ci) * 7}
                  fontSize={6.5}
                  fontWeight="700"
                  fill="#fff"
                  stroke="rgba(0,0,0,0.55)"
                  strokeWidth={0.4}
                  textAnchor="middle"
                >
                  {ch}
                </SvgText>
              ))
            ) : (
              <SvgText
                x={x + w / 2}
                y={centerY + h / 2 - 8}
                fontSize={6.5}
                fontWeight="700"
                fill="#fff"
                stroke="rgba(0,0,0,0.55)"
                strokeWidth={0.4}
                textAnchor="middle"
              >
                {unitLabel}
              </SvgText>
            )}
          </G>
        );
      })}
      {/* Clamp collar, on top of the stack */}
      {clampW > 0 && (
        <Rect
          x={clampX}
          y={centerY - maxPlateH * 0.14}
          width={clampW}
          height={maxPlateH * 0.28}
          rx={2}
          fill={collarBg}
        />
      )}
    </Svg>
  );
}
