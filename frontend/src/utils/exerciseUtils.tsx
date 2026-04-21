/**
 * Utility helpers for working with exercise body parts
 */

import { BodyPartDTO } from "../api/exerciseService";
import { Text } from "react-native";

/** Get the first PRIMARY body part name (for section grouping) */
export function getPrimaryBodyPart(bodyParts: BodyPartDTO[]): string {
  const primary = bodyParts.find((bp) => bp.targetType === "PRIMARY");
  return primary?.bodyPart ?? bodyParts[0]?.bodyPart ?? "OTHER";
}

/** Get all body parts of a given target type */
export function getBodyPartsByType(
  bodyParts: BodyPartDTO[],
  targetType: BodyPartDTO["targetType"],
): string[] {
  return bodyParts
    .filter((bp) => bp.targetType === targetType)
    .map((bp) => bp.bodyPart);
}

/** Get all unique body part names (for chip filtering — matches any) */
export function getAllBodyPartNames(bodyParts: BodyPartDTO[]): string[] {
  return bodyParts.map((bp) => bp.bodyPart);
}

/** Check if an exercise matches a body part filter (any target type) */
export function matchesBodyPart(
  bodyParts: BodyPartDTO[],
  filter: string,
): boolean {
  return bodyParts.some((bp) => bp.bodyPart === filter);
}

/** Format body parts for display — returns primary names joined */
export function formatPrimaryBodyParts(bodyParts: BodyPartDTO[]): string {
  const primaries = getBodyPartsByType(bodyParts, "PRIMARY");
  if (primaries.length === 0 && bodyParts.length > 0) {
    return bodyParts[0].bodyPart;
  }
  return primaries.join(", ") || "OTHER";
}

/** Format muscle group names for display — title case, comma-separated */
export function formatMuscleGroups(input: BodyPartDTO[] | string[]): string {
  const names =
    input.length > 0 && typeof input[0] === "string"
      ? (input as string[])
      : (input as BodyPartDTO[]).map((bp) => bp.bodyPart);

  if (names.length === 0) return "OTHER";

  return names
    .map(
      (name) => name.charAt(0) + name.slice(1).toLowerCase().replace("_", " "),
    )
    .join(", ");
}

/** Render body part names as Text with primary bolded */
export function renderBodyParts(
  bodyParts: BodyPartDTO[],
  color: string,
  primaryColor: string = color,
): React.ReactNode {
  const sorted = [...bodyParts].sort((a, b) => {
    if (a.targetType === "PRIMARY" && b.targetType !== "PRIMARY") return -1;
    if (a.targetType !== "PRIMARY" && b.targetType === "PRIMARY") return 1;
    return 0;
  });

  return sorted.map((bp, i) => {
    const isPrimary = bp.targetType === "PRIMARY";
    const label =
      bp.bodyPart.charAt(0) +
      bp.bodyPart.slice(1).toLowerCase().replace("_", " ");
    return (
      <Text key={bp.bodyPart}>
        <Text
          style={{
            fontWeight: isPrimary ? "700" : "400",
            color: isPrimary ? primaryColor : color,
          }}
        >
          {label}
        </Text>
        {i < sorted.length - 1 && <Text style={{ color }}>, </Text>}
      </Text>
    );
  });
}
