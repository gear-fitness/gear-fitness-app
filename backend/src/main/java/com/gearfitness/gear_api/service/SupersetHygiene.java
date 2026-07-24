package com.gearfitness.gear_api.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Server-side backstop for the superset adjacency invariant. Clients keep
// group members adjacent, but adjacency is never trusted: legacy-shaped
// routine updates can reorder without knowing groups exist.
public final class SupersetHygiene {

  private SupersetHygiene() {}

  // Takes raw superset group values in position order and returns the
  // sanitized values: a valid group is exactly one contiguous run of 2 or
  // more members, so singletons and non-contiguous groups become null, and
  // surviving groups are renumbered 1..N by first appearance.
  public static List<Integer> normalize(List<Integer> groups) {
    Map<Integer, List<Integer>> indicesByGroup = new LinkedHashMap<>();
    for (int i = 0; i < groups.size(); i++) {
      Integer group = groups.get(i);
      if (group != null) {
        indicesByGroup.computeIfAbsent(group, k -> new ArrayList<>()).add(i);
      }
    }

    List<Integer> result = new ArrayList<>(
      Collections.nCopies(groups.size(), (Integer) null)
    );
    int nextGroup = 1;
    for (List<Integer> indices : indicesByGroup.values()) {
      boolean contiguous =
        indices.get(indices.size() - 1) - indices.get(0) + 1 == indices.size();
      if (indices.size() < 2 || !contiguous) {
        continue;
      }
      for (int index : indices) {
        result.set(index, nextGroup);
      }
      nextGroup++;
    }
    return result;
  }
}
