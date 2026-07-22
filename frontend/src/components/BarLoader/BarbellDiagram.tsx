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
   * renders leftmost against the bar tag and each later plate stacks to
   * the right, so newly loaded plates land on the right end. Plates carry
   * their own unit, so kg and lb plates can share the bar.
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
  const shaftColor = isDark ? "#6C6C70" : "#AEAEB2";
  const tagBg = isDark ? "#48484A" : "#8E8E93";
  // Thin outline separating flush plates (two touching reds stay legible).
  const plateOutline = isDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.9)";

  const centerY = height / 2;
  const maxPlateH = height * 0.94;

  // Chunky one-piece bar: a thick shaft spanning the full width with a
  // taller rounded weight tag overlapping it near the left end.
  const shaftH = height * 0.1;
  // Bar end protruding left of the tag: same length as before, but a
  // smaller diameter than the shaft, like a real bar's tip.
  const stubH = shaftH * 0.6;
  const tagX = 10;
  const tagW = 26;
  // The tag is part of the barbell, so its height tracks the shaft's.
  const tagH = shaftH * 1.8;
  const collarW = collarPerSide > 0 ? 8 : 0;

  // Plates keep their natural width and simply extend rightward along
  // the bar as the load grows; an extreme load clips at the right edge.

  // Plates sit flush: no gap between the tag and the first plate, none
  // between neighbors.
  let cursor = tagX + tagW;

  // Bottom of the stack leftmost, each later plate to the right.
  const drawn = plates.map((p) => {
    const geo = geometryFor(p);
    const w = geo.w;
    const h = geo.h * maxPlateH;
    const x = cursor;
    cursor += w;
    return { plate: p, x, w, h };
  });

  // Collar clamps the stack from outside, so it sits on top (rightmost).
  const collarX = cursor;

  return (
    <Svg width={width} height={height}>
      {/* Thin bar end, left of the tag */}
      <Rect
        x={0}
        y={centerY - stubH / 2}
        width={tagX + 4}
        height={stubH}
        rx={3}
        fill={shaftColor}
      />
      {/* Shaft, from the tag to the right edge */}
      <Rect
        x={tagX}
        y={centerY - shaftH / 2}
        width={width - tagX}
        height={shaftH}
        rx={6}
        fill={shaftColor}
      />
      {/* Bar-weight tag, overlapping the shaft */}
      <G>
        <Rect
          x={tagX}
          y={centerY - tagH / 2}
          width={tagW}
          height={tagH}
          rx={6}
          fill={tagBg}
        />
        <SvgText
          x={tagX + tagW / 2}
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
      {/* Collar, on top of the stack */}
      {collarW > 0 && (
        <Rect
          x={collarX}
          y={centerY - maxPlateH * 0.14}
          width={collarW}
          height={maxPlateH * 0.28}
          rx={2}
          fill={tagBg}
        />
      )}
    </Svg>
  );
}
