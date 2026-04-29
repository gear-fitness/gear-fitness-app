import apiClient from "./apiClient";
import { Routine } from "./types";
import { getCurrentLocalDateString } from "../utils/date";

export async function createRoutineFromWorkout(
  workoutId: string,
  name: string,
  scheduledDays: string[],
): Promise<Routine> {
  const { data } = await apiClient.post<Routine>("/routines/from-workout", {
    workoutId,
    name,
    scheduledDays,
  });
  return data;
}

export async function getUserRoutines(): Promise<Routine[]> {
  const { data } = await apiClient.get<Routine[]>("/routines");
  return data;
}

export async function getRoutineDetail(routineId: string): Promise<Routine> {
  const { data } = await apiClient.get<Routine>(`/routines/${routineId}`);
  return data;
}

export async function getTodaysRoutines(): Promise<Routine[]> {
  const { data } = await apiClient.get<Routine[]>("/routines/today", {
    params: { localDate: getCurrentLocalDateString() },
  });
  return data;
}

export async function updateRoutine(
  routineId: string,
  updateData: {
    name?: string;
    scheduledDays?: string[];
    exerciseIds?: string[];
  },
): Promise<Routine> {
  const { data } = await apiClient.put<Routine>(
    `/routines/${routineId}`,
    updateData,
  );
  return data;
}

export async function createRoutine(
  name: string,
  scheduledDays: string[],
  exerciseIds: string[],
): Promise<Routine> {
  const { data } = await apiClient.post<Routine>("/routines", {
    name,
    scheduledDays,
    exerciseIds,
  });
  return data;
}

export async function deleteRoutine(routineId: string): Promise<void> {
  await apiClient.delete(`/routines/${routineId}`);
}
