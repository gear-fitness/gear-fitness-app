import { StackActions } from "@react-navigation/native";

// Dismiss the workout-flow modal by popping ONLY the "WorkoutFlow" route out of
// the root navigator, targeting it by key. A plain parent.goBack() pops whatever
// is focused at the root: the root router ignores the dispatch source unless a
// matching target is also supplied (StackRouter POP computes currentIndex from
// source only when action.target === state.key), so if any route sits above the
// modal, or focus shifted mid-dispatch, goBack removes the wrong route. Popping
// WorkoutFlow by index leaves everything else (e.g. a PostDetail pushed above
// the modal) in place. Falls back to goBack when the parent or the WorkoutFlow
// route can't be found.
export function dismissWorkoutFlow(navigation: any) {
  const parent = navigation.getParent();
  if (!parent) {
    navigation.goBack();
    return;
  }
  const parentState = parent.getState();
  const flowRoute = parentState.routes.find(
    (r: { name: string }) => r.name === "WorkoutFlow",
  );
  if (!flowRoute) {
    parent.goBack();
    return;
  }
  parent.dispatch({
    ...StackActions.pop(1),
    source: flowRoute.key,
    target: parentState.key,
  });
}
