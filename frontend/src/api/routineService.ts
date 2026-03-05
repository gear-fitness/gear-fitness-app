import { getAuthHeader } from "../utils/auth";
import { Routine } from "./types";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export async function createRoutineFromWorkout(
  workoutId: string,
  name: string,
  scheduledDays: string[],
): Promise<Routine> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/routines/from-workout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
    body: JSON.stringify({ workoutId, name, scheduledDays }),
  });

  if (!response.ok) {
    throw new Error("Failed to create routine");
  }

  return response.json();
}

export async function getUserRoutines(): Promise<Routine[]> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/routines`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch routines");
  }
  return response.json();
}

export async function getRoutineDetail(routineId: string): Promise<Routine> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/routines/${routineId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch routine detail");
  }

  return response.json();
}

export async function getTodaysRoutines(): Promise<Routine[]> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/routines/today`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch today's routine");
  }

  return response.json();
}

export async function updateRoutine(
  routineId: string,
  data: {
    name?: string;
    scheduledDays?: string[];
  },
): Promise<Routine> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/routines/${routineId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to update routine");
  }

  return response.json();
}

export async function deleteRoutine(routineId: string): Promise<void> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/routines/${routineId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete routine");
  }
}
