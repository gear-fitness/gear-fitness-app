import { useState, useMemo } from "react";
import { Exercise } from "../api/exerciseService";
import {
  getAllBodyPartNames,
  getPrimaryBodyPart,
  matchesBodyPart,
} from "../utils/exerciseUtils";

export interface ExerciseSection {
  title: string;
  data: Exercise[];
}

export function useExerciseFilter(exercises: Exercise[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);

  const bodyParts = useMemo(() => {
    const parts = new Set(
      exercises.flatMap((ex) => getAllBodyPartNames(ex.bodyParts)),
    );
    return Array.from(parts).sort();
  }, [exercises]);

  const sections = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    const filtered = exercises.filter((ex) => {
      const matchesSearch =
        !query ||
        ex.name.toLowerCase().includes(query) ||
        ex.bodyParts.some((bp) => bp.bodyPart.toLowerCase().includes(query));

      const matchesFilter =
        !selectedBodyPart || matchesBodyPart(ex.bodyParts, selectedBodyPart);

      return matchesSearch && matchesFilter;
    });

    const grouped: Record<string, Exercise[]> = {};
    filtered.forEach((ex) => {
      const key = getPrimaryBodyPart(ex.bodyParts);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ex);
    });

    return Object.keys(grouped)
      .sort()
      .map((key) => ({
        title: key,
        data: grouped[key].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [exercises, searchQuery, selectedBodyPart]);

  return {
    searchQuery,
    setSearchQuery,
    selectedBodyPart,
    setSelectedBodyPart,
    bodyParts,
    sections,
  };
}
