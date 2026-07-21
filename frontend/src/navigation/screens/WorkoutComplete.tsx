import {
  StyleSheet,
  useColorScheme,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Image,
  useWindowDimensions,
} from "react-native";
import { Text, TextInput } from "../../components/Text";
import Svg, { Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { useWorkoutTimer } from "../../context/WorkoutContext";
import { useSocialFeed } from "../../context/SocialFeedContext";
import { WorkoutSubmission } from "../../api/workoutService";
import { GymLocation } from "../../api/locationService";
import { addRecentGym } from "../../utils/locationRecents";
import { LocationPicker } from "../../components/LocationPicker";
import { openCamera } from "../../utils/inAppCamera";
import { PhotoSourceMenu } from "../../components/PhotoSourceMenu";
import { getSavePhotosOnPost } from "../../utils/photoPrefs";
import { enqueueWorkout, flushWorkoutQueue } from "../../utils/workoutQueue";
import { dismissWorkoutFlow } from "../../utils/dismissWorkoutFlow";
import {
  getCurrentLocalDateString,
  getLocalDateStringFromEpoch,
} from "../../utils/date";
import { useTrackTab } from "../../hooks/useTrackTab";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";
import { MentionTextInput } from "../../components/MentionTextInput";
import { formatTag } from "../../utils/formatTag";
import { getAllBodyPartNames } from "../../utils/exerciseUtils";
import { MUSCLE_GROUPS } from "../../constants/muscleGroups";

const ACCENT = "#111";
const DESTRUCTIVE = "#C93838";
const MAX_PHOTOS = 4;

type Theme = {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  chipBg: string;
  chipBorder: string;
};

export function WorkoutComplete() {
  useTrackTab("WorkoutComplete");

  const isDark = useColorScheme() === "dark";
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const photoTileSize = Math.floor((screenWidth - 40 - 24) / 4);
  const {
    exercises,
    seconds,
    workoutStartedAtEpoch,
    reset,
    beginFinishing,
    endFinishing,
    getSessionGeneration,
    getOrMintIdempotencyKey,
  } = useWorkoutTimer();
  const { invalidateAll: invalidateFeeds } = useSocialFeed();

  const initialBodyTags = useMemo(() => {
    const tags = new Set(
      exercises.flatMap((ex) =>
        ex.bodyParts ? getAllBodyPartNames(ex.bodyParts) : [],
      ),
    );
    return tags.size > 0 ? Array.from(tags) : ["FULL_BODY"];
  }, [exercises]);

  const [workoutName, setWorkoutName] = useState("");
  const [bodyTags, setBodyTags] = useState<string[]>(initialBodyTags);
  const [caption, setCaption] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<
    "PUBLIC" | "FRIENDS" | "PRIVATE"
  >("PUBLIC");
  const [location, setLocation] = useState<GymLocation | null>(null);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  // URIs captured with the in-app camera this session. These exist only in
  // the app's cache, so (unlike library picks) they're candidates for
  // saving to the photo library when the workout is posted.
  const cameraCaptureUris = useRef<Set<string>>(new Set());

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () =>
      setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(hideEvent, () =>
      setKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const t: Theme = isDark
    ? {
        bg: "#0a0a0a",
        surface: "#141414",
        text: "#fff",
        textMuted: "rgba(255,255,255,0.55)",
        textFaint: "rgba(255,255,255,0.4)",
        border: "rgba(255,255,255,0.08)",
        chipBg: "rgba(255,255,255,0.08)",
        chipBorder: "rgba(255,255,255,0.28)",
      }
    : {
        bg: "#fafafa",
        surface: "#ffffff",
        text: "#000",
        textMuted: "rgba(0,0,0,0.5)",
        textFaint: "rgba(0,0,0,0.4)",
        border: "rgba(0,0,0,0.08)",
        chipBg: "rgba(0,0,0,0.05)",
        chipBorder: "rgba(0,0,0,0.22)",
      };

  const durationMin = Math.floor(seconds / 60);
  const totalSets = exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.reps && s.weight).length,
    0,
  );

  const addPhotos = (uris: string[]) => {
    setPhotos((prev) => [...prev, ...uris].slice(0, MAX_PHOTOS));
  };

  const takePhotoWithCamera = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const remaining = MAX_PHOTOS - photos.length;
    const result = await openCamera(navigation, {
      // Applied if the user picks via the camera screen's library shortcut.
      library: {
        allowsMultipleSelection: remaining > 1,
        selectionLimit: remaining,
      },
    });
    if (result?.uris.length) {
      if (result.source === "capture") {
        result.uris.forEach((uri) => cameraCaptureUris.current.add(uri));
      }
      addPhotos(result.uris);
    }
  };

  // Save in-app camera captures to the photo library when posting, if the
  // "Save Camera Photos" setting is on (default). Fire-and-forget: failures
  // never block the post. Saved URIs leave the set so a failed post that's
  // retried doesn't save duplicates.
  const saveCapturedPhotosIfEnabled = async () => {
    const toSave = photos.filter((uri) => cameraCaptureUris.current.has(uri));
    if (toSave.length === 0) return;
    try {
      if (!(await getSavePhotosOnPost())) return;
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) return;
      for (const uri of toSave) {
        await MediaLibrary.saveToLibraryAsync(uri);
        cameraCaptureUris.current.delete(uri);
      }
    } catch (err) {
      console.error("Failed to save camera photos to library:", err);
    }
  };

  const chooseFromLibrary = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const remaining = MAX_PHOTOS - photos.length;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Photo Access Required",
        "Please allow photo library access in Settings to attach photos.",
        [{ text: "OK" }],
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      addPhotos(result.assets.map((a) => a.uri).slice(0, remaining));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleBodyTag = (tag: string) => {
    setBodyTags((prev) => {
      if (prev.includes(tag)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== tag);
      }
      return [...prev, tag];
    });
  };

  const popOutOfFlow = () => {
    dismissWorkoutFlow(navigation);
  };

  // Fire-and-forget delivery kick. The outbox owns the post from here;
  // refresh the feeds when a pass lands something so the upload bar on the
  // social feed resolves into the real post. invalidateFeeds is a context
  // function, safe to call after this screen unmounts.
  const kickFlush = () => {
    flushWorkoutQueue()
      .then((posted) => {
        if (posted > 0) invalidateFeeds();
      })
      .catch((err) => console.error("Workout queue flush failed:", err));
  };

  const handlePost = async () => {
    if (!workoutName.trim()) {
      Alert.alert("Error", "Please enter a workout name");
      return;
    }
    if (exercises.length === 0) {
      Alert.alert("Error", "No exercises to save");
      return;
    }

    // Open the finishing window synchronously, before the first await, so a
    // background/inactive event during the enqueue (including the iOS
    // permission dialog saveCapturedPhotosIfEnabled can trigger) can neither
    // arm the unfinished-workout reminder nor re-persist state. Must come
    // AFTER the validation early-returns above: they exit outside the
    // try/finally that closes the window. Closed in finally.
    beginFinishing();
    // If the user tears this flow down and starts a new workout while the
    // enqueue is suspended mid-await, the generation changes and this flow
    // must not reset() the new session or pop its navigation.
    const sessionAtPost = getSessionGeneration();
    // Read synchronously before the first await: ties the queue entry, the
    // persisted blob, and the server row to this workout session so any
    // resubmit (queue re-flush, restored ghost) dedupes server-side.
    const idempotencyKey = getOrMintIdempotencyKey();

    setLoading(true);
    void saveCapturedPhotosIfEnabled();

    // Photo fields (imageUrl/photoUrls) are deliberately absent: photos ride
    // on the queue entry as local URIs and are compressed + uploaded at
    // flush time.
    const buildSubmission = (): WorkoutSubmission => ({
      name: workoutName,
      durationMin,
      // Date the workout by when it was STARTED, not when it's submitted, so a
      // session that crosses local midnight counts on the day training began.
      // Falls back to "now" if the start stamp is somehow missing.
      datePerformed:
        workoutStartedAtEpoch != null
          ? getLocalDateStringFromEpoch(workoutStartedAtEpoch)
          : getCurrentLocalDateString(),
      bodyTags: bodyTags, // Send all selected tags to backend
      exercises: exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets.map((set) => ({
          reps: set.reps,
          weight: set.weight,
        })),
        note: ex.note || "",
      })),
      // Privacy model: always create a post; the visibility selector controls
      // the audience (PUBLIC / FRIENDS / PRIVATE), where PRIVATE is "Only me".
      createPost: true,
      visibility,
      caption: caption || undefined,
      location: location ?? undefined,
    });

    // Remember the tagged gym so the picker can offer it instantly next time.
    // Recorded before the enqueue (not after) so nothing lands inside the
    // enqueue→reset() kill-safety window below; a failed enqueue leaving a
    // recent behind is harmless — recents are only suggestions.
    if (location) void addRecentGym(location);

    try {
      // COMMIT POINT. Once the entry is in the outbox, the workout is posted
      // from the user's point of view; delivery (photo upload + submit) is
      // the queue's job, online and offline alike, and the server dedupes on
      // the idempotency key.
      await enqueueWorkout(buildSubmission(), [...photos], idempotencyKey);

      if (getSessionGeneration() !== sessionAtPost) {
        // The session this flow was posting no longer exists (the user tore
        // the flow down and started another one while we were awaiting). The
        // queue entry is safe; leave the new session alone.
        kickFlush();
        return;
      }
      // INVARIANT: nothing may be inserted between enqueueWorkout resolving
      // and the synchronous head of reset(). A kill inside this window
      // leaves both the queue entry and the live blob; restore reconciles
      // that by idempotency key, but the window must stay minimal.
      await reset();

      kickFlush();
      // Instant close: no confirmation alert. Land where the post will
      // actually surface: the social feed (whose upload bar shows delivery
      // progress) for PUBLIC/FRIENDS, but Profile for PRIVATE ("Only me"),
      // which never appears in the public feeds; its pending card shows the
      // same delivery state there. Dismiss the flow first, then switch tabs
      // on the navigator underneath. popTo (not navigate) reaches the
      // EXISTING HomeTabs instance even if another route (e.g. a PostDetail
      // pushed above the modal) survived the targeted pop; navigate would
      // only reuse HomeTabs when it is already on top and would otherwise
      // push a second instance, presented modally. Tabs must never open that
      // way. Dispatched on the root navigator (like dismissWorkoutFlow)
      // because this screen's own navigator is being unmounted by the pop
      // and can't be trusted to bubble the action.
      const rootNavigation = navigation.getParent();
      popOutOfFlow();
      (rootNavigation ?? navigation).popTo("HomeTabs", {
        screen: visibility === "PRIVATE" ? "Profile" : "Explore",
      });
    } catch (error) {
      // Only the enqueue itself can land here (storage failure, no active
      // user). Nothing was committed; keep the composer so the user can try
      // again.
      console.error("Failed to queue workout for posting:", error);
      Alert.alert("Error", "Failed to save workout. Please try again.");
    } finally {
      // Close the finishing window. On success reset() has already engaged
      // the write barrier, so the AppState handler stays inert; on failure
      // the workout is genuinely unfinished again and the reminder semantics
      // must come back.
      endFinishing();
      setLoading(false);
    }
  };

  const handleDiscardWorkout = () => {
    Alert.alert(
      "Discard Workout",
      "Are you sure you want to discard this workout? All progress will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            reset();
            popOutOfFlow();
          },
        },
      ],
    );
  };

  const footerShadow = isDark
    ? null
    : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 4,
      };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <FloatingCloseButton
        direction="left"
        accessibilityLabel="Back to summary"
        onPress={() => navigation.popTo("WorkoutSummary")}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{
          paddingTop: insets.top + 68,
          paddingBottom: 20,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroBlock}>
          <Text style={[styles.overline, { color: t.textMuted }]}>
            WORKOUT COMPLETE
          </Text>
          <Text
            style={[styles.heroTitle, { color: t.text }]}
            maxFontSizeMultiplier={1}
          >
            Nice work.
          </Text>

          <View style={styles.metricsRow}>
            <Metric label="Time" value={`${durationMin} min`} t={t} />
            <Metric label="Exercises" value={exercises.length} t={t} />
            <Metric label="Sets" value={totalSets} t={t} />
          </View>
        </View>

        {/* Workout name */}
        <Section label="Workout name" required t={t}>
          <TextInput
            value={workoutName}
            onChangeText={setWorkoutName}
            placeholder="e.g. Chest day"
            placeholderTextColor={t.textMuted}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            maxFontSizeMultiplier={1}
            style={[
              styles.nameInput,
              { color: t.text, borderBottomColor: t.border },
            ]}
          />
        </Section>

        {/* Location — optional gym tag */}
        <Section label="Location" hint="Optional" t={t}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setLocationPickerVisible(true)}
            style={[
              styles.locationRow,
              { backgroundColor: t.surface, borderColor: t.border },
            ]}
          >
            <Ionicons
              name="location-outline"
              size={18}
              color={location ? t.text : t.textMuted}
            />
            <Text
              style={[
                styles.locationText,
                { color: location ? t.text : t.textMuted },
              ]}
              numberOfLines={1}
            >
              {location ? location.name : "Add location"}
            </Text>
            {location && (
              <TouchableOpacity
                accessibilityLabel="Remove location"
                activeOpacity={0.7}
                onPress={() => setLocation(null)}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={18} color={t.textMuted} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </Section>

        {/* Body tag */}
        <Section label="Body tag" required t={t}>
          <View style={styles.tagWrap}>
            {MUSCLE_GROUPS.map((tag) => {
              const active = bodyTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  activeOpacity={0.7}
                  onPress={() => toggleBodyTag(tag)}
                  style={[
                    styles.tagButton,
                    active
                      ? {
                          backgroundColor: isDark ? "#fff" : ACCENT,
                          borderColor: isDark ? "#fff" : ACCENT,
                        }
                      : {
                          backgroundColor: "transparent",
                          borderColor: t.chipBorder,
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      { color: active ? (isDark ? "#000" : "#fff") : t.text },
                    ]}
                  >
                    {formatTag(tag)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* Exercises summary */}
        <Section label={`Exercises (${exercises.length})`} t={t}>
          <View style={styles.exerciseList}>
            {exercises.map((ex) => {
              const count = ex.sets.filter((s) => s.reps && s.weight).length;
              return (
                <View
                  key={ex.workoutExerciseId}
                  style={[
                    styles.exerciseCard,
                    { backgroundColor: t.surface, borderColor: t.border },
                  ]}
                >
                  <Text
                    style={[styles.exerciseName, { color: t.text }]}
                    numberOfLines={1}
                  >
                    {ex.name}
                  </Text>
                  <Text style={[styles.setsCount, { color: t.textMuted }]}>
                    {count} sets
                  </Text>
                </View>
              );
            })}
          </View>
        </Section>

        {/* Caption */}
        <Section label="How'd it go?" t={t}>
          <View
            style={[
              styles.captionCard,
              {
                backgroundColor: t.chipBg,
                borderColor: t.border,
                borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
              },
            ]}
          >
            <MentionTextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Felt strong today. Hit a PR on…"
              placeholderTextColor={t.textFaint}
              multiline
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
              style={[styles.captionInput, { color: t.text }]}
            />
          </View>
        </Section>

        {/* Photos — tap-to-add tile + thumbnails */}
        <Section label="Photos" hint={`${photos.length}/${MAX_PHOTOS}`} t={t}>
          <View style={styles.photoGrid}>
            {photos.map((uri, i) => (
              <View
                key={`${uri}-${i}`}
                style={[
                  styles.photoTile,
                  {
                    width: photoTileSize,
                    height: photoTileSize,
                    borderColor: t.border,
                    backgroundColor: t.chipBg,
                  },
                ]}
              >
                <Image
                  source={{ uri }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  accessibilityLabel="Remove photo"
                  activeOpacity={0.7}
                  onPress={() => removePhoto(i)}
                  style={styles.photoRemove}
                >
                  <Svg width={10} height={10} viewBox="0 0 12 12" fill="none">
                    <Path
                      d="M3 3l6 6M9 3l-6 6"
                      stroke="#fff"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                  </Svg>
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <PhotoSourceMenu
                width={photoTileSize}
                height={photoTileSize}
                onTakePhoto={takePhotoWithCamera}
                onChooseFromLibrary={chooseFromLibrary}
              >
                <View
                  style={[
                    styles.photoAdd,
                    {
                      width: photoTileSize,
                      height: photoTileSize,
                      borderColor: t.chipBorder,
                    },
                  ]}
                >
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 6v12M6 12h12"
                      stroke={t.textMuted}
                      strokeWidth={1.6}
                      strokeLinecap="round"
                    />
                  </Svg>
                  {photos.length === 0 && (
                    <Text
                      style={[styles.photoAddLabel, { color: t.textMuted }]}
                    >
                      Add photo
                    </Text>
                  )}
                </View>
              </PhotoSourceMenu>
            )}
          </View>
        </Section>

        {/* Discard — tertiary destructive link */}
        <TouchableOpacity
          activeOpacity={0.5}
          style={styles.discardLink}
          onPress={handleDiscardWorkout}
          disabled={loading}
        >
          <Text style={styles.discardText}>Discard workout</Text>
        </TouchableOpacity>
      </ScrollView>

      <LocationPicker
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
        selected={location}
        onSelect={setLocation}
      />

      {/* Footer — hidden while keyboard is open */}
      {!keyboardVisible && (
        <View
          style={[
            styles.footerWrap,
            {
              backgroundColor: t.bg,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          {/* Visibility picker */}
          <View style={styles.visibilityRow}>
            {(
              [
                { value: "PUBLIC", icon: "globe-outline", label: "Everyone" },
                { value: "FRIENDS", icon: "people-outline", label: "Friends" },
                {
                  value: "PRIVATE",
                  icon: "lock-closed-outline",
                  label: "Only me",
                },
              ] as const
            ).map((opt) => {
              const active = visibility === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  activeOpacity={0.7}
                  onPress={() => setVisibility(opt.value)}
                  style={[
                    styles.visChip,
                    {
                      backgroundColor: active
                        ? isDark
                          ? "#fff"
                          : ACCENT
                        : t.chipBg,
                      borderColor: active
                        ? isDark
                          ? "#fff"
                          : ACCENT
                        : t.chipBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={14}
                    color={active ? (isDark ? "#000" : "#fff") : t.text}
                  />
                  <Text
                    style={[
                      styles.visChipLabel,
                      { color: active ? (isDark ? "#000" : "#fff") : t.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View
            style={[
              styles.footerCard,
              footerShadow,
              {
                backgroundColor: t.surface,
                borderColor: t.border,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.footerBtn,
                { backgroundColor: isDark ? "#fff" : ACCENT },
              ]}
              onPress={handlePost}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={isDark ? "#000" : "#fff"} />
              ) : (
                <View style={styles.footerBtnContent}>
                  <Text
                    style={[
                      styles.footerBtnText,
                      { color: isDark ? "#000" : "#fff" },
                    ]}
                  >
                    Post
                  </Text>
                  <Text
                    style={[
                      styles.footerBtnArrow,
                      {
                        color: isDark
                          ? "rgba(0,0,0,0.6)"
                          : "rgba(255,255,255,0.6)",
                      },
                    ]}
                  >
                    →
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function Metric({
  label,
  value,
  t,
}: {
  label: string;
  value: string | number;
  t: Theme;
}) {
  return (
    <View>
      <Text style={[styles.metricLabel, { color: t.textMuted }]}>{label}</Text>
      <Text
        style={[styles.metricValue, { color: t.text }]}
        maxFontSizeMultiplier={1}
      >
        {value}
      </Text>
    </View>
  );
}

function Section({
  label,
  required,
  hint,
  children,
  t,
}: {
  label: string;
  required?: boolean;
  hint?: string | null;
  children: React.ReactNode;
  t: Theme;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionLabelRow}>
        <Text style={[styles.sectionLabel, { color: t.textMuted }]}>
          {label.toUpperCase()}
          {required ? " *" : ""}
        </Text>
        {hint ? (
          <Text style={[styles.sectionHint, { color: t.textFaint }]}>
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroBlock: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  overline: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: "LibreCaslonText_400Regular",
    fontSize: 40,
    fontWeight: "400",
    letterSpacing: -0.4,
    lineHeight: 48,
  },
  metricsRow: {
    flexDirection: "row",
    marginTop: 20,
    gap: 28,
    alignItems: "flex-start",
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: "400",
  },
  nameInput: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 0,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "600",
    letterSpacing: -0.4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  tagButton: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  exerciseList: {
    gap: 6,
    marginTop: 4,
  },
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  exerciseName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  setsCount: {
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    marginLeft: 12,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  photoTile: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    position: "relative",
  },
  photoRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoAdd: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  photoAddLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  captionCard: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 4,
  },
  captionInput: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
    minHeight: 66,
    textAlignVertical: "top",
    padding: 0,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  discardLink: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    alignItems: "center",
  },
  discardText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    color: DESTRUCTIVE,
  },
  footerWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  visibilityRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  visChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  visChipLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  footerCard: {
    padding: 4,
    borderRadius: 16,
    gap: 2,
  },
  footerBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  footerBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerBtnText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  footerBtnArrow: {
    fontSize: 15,
    fontWeight: "400",
    color: "rgba(255,255,255,0.6)",
  },
});
