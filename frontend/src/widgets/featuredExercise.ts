import AsyncStorage from "@react-native-async-storage/async-storage";

const FEATURED_EXERCISE_KEY = "@gearfitness/featuredExerciseId";

export async function getFeaturedExerciseId(): Promise<string | null> {
  return AsyncStorage.getItem(FEATURED_EXERCISE_KEY);
}

export async function setFeaturedExerciseId(id: string | null): Promise<void> {
  if (id == null) {
    await AsyncStorage.removeItem(FEATURED_EXERCISE_KEY);
  } else {
    await AsyncStorage.setItem(FEATURED_EXERCISE_KEY, id);
  }
}
