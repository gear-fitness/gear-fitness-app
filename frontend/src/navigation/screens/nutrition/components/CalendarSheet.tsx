import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { CalendarList } from "react-native-calendars";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "../../../../hooks/useThemeColors";
import { BottomSheet } from "../../../../components/BottomSheet";
import { getLoggedDates } from "../../../../api/nutritionService";
import {
  getCurrentLocalDateString,
  getLocalDateStringFromEpoch,
  parseLocalDate,
} from "../../../../utils/date";

// How far the "days with entries" markers reach: the fetch window sent to
// /nutrition/logged-dates when the sheet opens. Two years back covers any
// realistic scroll; a year forward covers pre-logged future meals.
const LOOKBACK_DAYS = 730;
const LOOKAHEAD_DAYS = 365;

// Months the horizontal pager can reach, matching the fetch window above.
const PAST_MONTHS = 24;
const FUTURE_MONTHS = 12;

// Fixed pager height: weekday header plus six 40pt week rows. Sized for the
// tallest month so the sheet doesn't change height (or clip a sixth row) as
// pages of different week counts scroll past.
const CALENDAR_HEIGHT = 288;

function shiftDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return getLocalDateStringFromEpoch(d.getTime());
}

/**
 * Calendar bottom sheet for jumping the tracker to any day. Days with logged
 * entries are filled green, the selected day is ringed, future days are greyed
 * but still tappable (so meals can be logged ahead), and a Today pill snaps
 * back after scrolling far out. Tapping a day selects it immediately (the
 * screen behind updates live); Done dismisses.
 */
export function CalendarSheet({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
}: {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const t = useThemeColors();
  const todayStr = getCurrentLocalDateString();
  const loggedGreen = t.isDark ? "#30D158" : "#34C759";
  const { width: windowWidth } = useWindowDimensions();
  const listRef = useRef<any>(null);

  // Days that have at least one logged entry, refetched on each open so a
  // just-logged meal shows its green marker immediately.
  const [logged, setLogged] = useState<Set<string>>(new Set());

  // The month the pager mounted on (its `current`). Changing it alone never
  // moves an already-mounted list, so each open (and the Today pill's
  // fallback) bumps mountKey to remount anchored on the right month.
  const [monthAnchor, setMonthAnchor] = useState(selectedDate);
  const [mountKey, setMountKey] = useState(0);
  // First-of-month string for the month currently in view (via swipes), shown
  // as the header title.
  const [visibleMonth, setVisibleMonth] = useState(selectedDate);

  useEffect(() => {
    if (!visible) return;
    // Land on the selected day's month each open. The remount also resets any
    // far-out scroll position from the previous open.
    setMonthAnchor(selectedDate);
    setVisibleMonth(selectedDate);
    setMountKey((k) => k + 1);
    let cancelled = false;
    getLoggedDates(
      shiftDays(todayStr, -LOOKBACK_DAYS),
      shiftDays(todayStr, LOOKAHEAD_DAYS),
    )
      .then((dates) => {
        if (!cancelled) setLogged(new Set(dates));
      })
      .catch(() => {}); // markers are decoration; selection still works
    return () => {
      cancelled = true;
    };
    // Only an open should re-anchor; day taps while open must not snap the view.
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Marking drives which day cells react-native-calendars re-renders, so both
  // the green fill and the selection ring must flow through markedDates even
  // though dayComponent does the actual drawing.
  const marked = useMemo(() => {
    const m: Record<string, { marked?: boolean; selected?: boolean }> = {};
    logged.forEach((d) => {
      m[d] = { marked: true };
    });
    m[selectedDate] = { ...(m[selectedDate] ?? {}), selected: true };
    return m;
  }, [logged, selectedDate]);

  const selectDay = (dateString: string) => {
    Haptics.selectionAsync().catch(() => {});
    onSelectDate(dateString);
  };

  const jumpToday = () => {
    Haptics.selectionAsync().catch(() => {});
    onSelectDate(todayStr);
    setVisibleMonth(todayStr);
    // Scroll the pager back in place; remount only if the ref method is
    // unavailable so the jump always lands.
    if (listRef.current?.scrollToMonth) {
      listRef.current.scrollToMonth(todayStr);
    } else {
      setMonthAnchor(todayStr);
      setMountKey((k) => k + 1);
    }
  };

  const monthTitle = parseLocalDate(visibleMonth).toLocaleDateString(
    undefined,
    { month: "short", year: "numeric" },
  );

  return (
    // bodyDrag off: the calendar owns horizontal swipes and every cell is
    // tappable; dismiss via the grabber, backdrop, or Done.
    <BottomSheet visible={visible} onClose={onClose} bodyDrag={false}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[styles.pill, { borderColor: t.border }]}
          onPress={jumpToday}
          accessibilityLabel="Jump to today"
        >
          <Text style={[styles.pillText, { color: t.tint }]}>Today</Text>
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: t.text }]}>{monthTitle}</Text>
        <TouchableOpacity
          style={[styles.pill, { borderColor: t.border }]}
          onPress={onClose}
          accessibilityLabel="Done"
        >
          <Text style={[styles.pillText, styles.doneText, { color: t.tint }]}>
            Done
          </Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal pager: real native paging (momentum + animated settle)
          instead of enableSwipeMonths' instant on-release month swap. */}
      <CalendarList
        ref={listRef}
        key={`${t.isDark ? "dark" : "light"}-${windowWidth}-${mountKey}`}
        horizontal
        pagingEnabled
        calendarWidth={windowWidth}
        calendarHeight={CALENDAR_HEIGHT}
        style={styles.pager}
        pastScrollRange={PAST_MONTHS}
        futureScrollRange={FUTURE_MONTHS}
        showScrollIndicator={false}
        current={monthAnchor}
        hideArrows
        renderHeader={() => null}
        hideExtraDays
        markedDates={marked}
        onVisibleMonthsChange={(months: { dateString: string }[]) => {
          if (months[0]) setVisibleMonth(months[0].dateString);
        }}
        dayComponent={({ date, marking }: any) => {
          if (!date) return <View style={styles.dayCell} />;
          const isLogged = !!marking?.marked;
          const isSelected = !!marking?.selected;
          const isFuture = date.dateString > todayStr;
          const isToday = date.dateString === todayStr;
          return (
            <TouchableOpacity
              style={styles.dayCell}
              onPress={() => selectDay(date.dateString)}
              accessibilityLabel={`Select ${date.dateString}`}
            >
              <View
                style={[
                  styles.dayCircle,
                  isLogged && { backgroundColor: loggedGreen },
                  isSelected && { borderWidth: 2, borderColor: t.tint },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    {
                      color: isLogged
                        ? "#fff"
                        : isFuture
                          ? t.handle
                          : isToday
                            ? t.tint
                            : t.text,
                    },
                    isToday && !isLogged && styles.todayText,
                  ]}
                >
                  {date.day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        theme={{
          backgroundColor: "transparent",
          calendarBackground: "transparent",
          textSectionTitleColor: t.secondary,
          textDayHeaderFontFamily: "System",
          textDayHeaderFontWeight: "600",
          textDayHeaderFontSize: 11,
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  pill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillText: { fontSize: 14, fontWeight: "500" },
  doneText: { fontWeight: "700" },
  monthTitle: { fontSize: 17, fontWeight: "600" },
  // Fixed pager height (see CALENDAR_HEIGHT) so 4-, 5-, and 6-week months all
  // page past without the sheet growing or clipping.
  pager: { height: CALENDAR_HEIGHT },
  dayCell: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { fontSize: 15, fontWeight: "600" },
  todayText: { fontWeight: "800" },
});
