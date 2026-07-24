package com.gearfitness.gear_api.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

class SupersetHygieneTest {

  @Test
  void emptyListStaysEmpty() {
    assertThat(SupersetHygiene.normalize(List.of())).isEmpty();
  }

  @Test
  void ungroupedExercisesStayNull() {
    List<Integer> result = SupersetHygiene.normalize(
      Arrays.asList(null, null, null)
    );

    assertThat(result).containsExactly(null, null, null);
  }

  @Test
  void groupsRenumberedByFirstAppearance() {
    List<Integer> result = SupersetHygiene.normalize(
      Arrays.asList(7, 7, null, 3, 3)
    );

    assertThat(result).containsExactly(1, 1, null, 2, 2);
  }

  @Test
  void tripleStaysOneGroup() {
    List<Integer> result = SupersetHygiene.normalize(Arrays.asList(2, 2, 2));

    assertThat(result).containsExactly(1, 1, 1);
  }

  @Test
  void singletonGroupNulledOut() {
    List<Integer> result = SupersetHygiene.normalize(
      Arrays.asList(5, null, null)
    );

    assertThat(result).containsExactly(null, null, null);
  }

  @Test
  void nonContiguousGroupNulledOut() {
    List<Integer> result = SupersetHygiene.normalize(Arrays.asList(1, null, 1));

    assertThat(result).containsExactly(null, null, null);
  }

  @Test
  void interleavedGroupsBothNulledOut() {
    List<Integer> result = SupersetHygiene.normalize(Arrays.asList(4, 9, 4, 9));

    assertThat(result).containsExactly(null, null, null, null);
  }

  @Test
  void brokenGroupNulledWhileIntactGroupSurvives() {
    List<Integer> result = SupersetHygiene.normalize(
      Arrays.asList(8, 2, 2, 8, null)
    );

    assertThat(result).containsExactly(null, 1, 1, null, null);
  }
}
