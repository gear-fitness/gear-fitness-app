# Frontend Design System Overhaul Plan

## Executive Summary

**Recommendation: Gradual Migration using react-native-reusables**

Your app has 17 screens with manual StyleSheet.create throughout, hardcoded colors, and inconsistent dark/light mode handling. The plan is a 3-4 week gradual migration to establish a modern component library and centralized design system.

---

## Library Recommendation: react-native-reusables

### Why react-native-reusables wins:

✅ **Copy/paste philosophy** - You own the code, 100% customizable
✅ **Expo compatible** - Works seamlessly with your dev builds
✅ **TypeScript-first** - Excellent type inference
✅ **Lightweight** - Only install what you need
✅ **Built on Radix UI** - Accessible compound components
✅ **NativeWind/Tailwind** - Modern styling with Tailwind classes
✅ **Active development** - Well-maintained, growing ecosystem

### Why NOT the alternatives:

- **gluestack-ui**: More opinionated, less control, recent v2 breaking rewrite
- **React Native Paper**: Material Design focused, doesn't match your iOS aesthetic
- **NativeBase**: Too heavy, larger bundle, slower performance

---

## Migration Strategy: Gradual Approach

**Why gradual migration:**
1. App is in active development - maintain stability
2. Complex features need careful testing (swipeable lists, workout timer, modals)
3. Start seeing benefits immediately
4. Team learns while maintaining velocity
5. Easy rollback if issues arise

**Timeline:** 3-4 weeks for complete migration

---

## Implementation Plan

### Phase 0: Foundation Setup (Days 1-2)

#### 1. Install Dependencies

```bash
cd frontend
npm install nativewind
npm install --save-dev tailwindcss
npx tailwindcss init
npm install class-variance-authority clsx tailwind-merge
```

#### 2. Configure Tailwind

Create `tailwind.config.js`:
```js
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#007AFF",
        destructive: "#FF3B30",
        // ... extended color palette
      },
    },
  },
  plugins: [],
}
```

Update `babel.config.js`:
```js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

#### 3. Create Design System Foundation

**Create:** `frontend/src/lib/utils.ts`
```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Create:** `frontend/src/lib/constants/colors.ts`
```typescript
export const Colors = {
  light: {
    primary: '#007AFF',
    destructive: '#FF3B30',
    background: '#ffffff',
    card: '#ffffff',
    text: '#000000',
    textSubtle: '#666666',
    border: '#cccccc',
    inputBg: '#f2f2f2',
    success: '#34C759',
  },
  dark: {
    primary: '#007AFF',
    destructive: '#FF3B30',
    background: '#000000',
    card: '#1c1c1e',
    text: '#ffffff',
    textSubtle: '#999999',
    border: '#333333',
    inputBg: '#2a2a2a',
    success: '#34C759',
  },
} as const;
```

**Create:** `frontend/src/context/ThemeContext.tsx`
```typescript
import { createContext, useContext, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '../lib/constants/colors';

type ThemeContextType = {
  colors: typeof Colors.light;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

#### 4. Wrap App with ThemeProvider

**Update:** `frontend/src/App.tsx`

Add import:
```typescript
import { ThemeProvider } from './context/ThemeContext';
```

Wrap in App component (after SafeAreaProvider, before WorkoutTimerProvider):
```typescript
<SafeAreaProvider>
  <ThemeProvider>
    <WorkoutTimerProvider>
      <Navigation ... />
      <WorkoutPlayer />
    </WorkoutTimerProvider>
  </ThemeProvider>
</SafeAreaProvider>
```

---

### Phase 1: Install Core Components (Days 3-5)

```bash
npx @react-native-reusables/cli@latest add button
npx @react-native-reusables/cli@latest add card
npx @react-native-reusables/cli@latest add input
npx @react-native-reusables/cli@latest add text
npx @react-native-reusables/cli@latest add avatar
npx @react-native-reusables/cli@latest add badge
npx @react-native-reusables/cli@latest add dialog
npx @react-native-reusables/cli@latest add sheet
```

These install to: `frontend/src/components/ui/`

Create custom wrappers as needed (e.g., IconButton, SwipeableCard).

---

### Phase 2: Migration Order (Weeks 1-3)

#### Week 1: Simple Screens (4 screens)
1. **NotFound.tsx** - Simplest screen (proof of concept)
2. **Login.tsx** - Auth screen
3. **FollowModal.tsx** - Simple modal component
4. **MiniPlayer.tsx** - Standalone component

#### Week 2: Medium Complexity (4 screens)
5. **Settings.tsx**
6. **Profile.tsx**
7. **Home.tsx** - Chart integration (keep react-native-chart-kit, theme it)
8. **FeedPostCard.tsx** - Important reusable component

#### Week 3: Complex Features (9 screens)
9. **Social.tsx** - Infinite scroll
10. **History.tsx** - Calendar integration
11. **Workout.tsx** - Animations
12. **WorkoutSummary.tsx** - Swipeable lists
13. **ExerciseSelect.tsx** - Most complex: modals, filters, search
14. **ExerciseDetailContent.tsx** - Complex forms
15. **WorkoutComplete.tsx** - Multi-step form
16. **PR.tsx**
17. **DetailedHistory.tsx**

---

### Phase 3: Migration Pattern Per Screen

#### Before (Example: Home.tsx)
```typescript
const styles = StyleSheet.create({
  activityCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
```

#### After
```typescript
import { Card, CardContent } from '../components/ui/card';
import { useTheme } from '../context/ThemeContext';

const { colors } = useTheme();

<Card>
  <CardContent className="p-4">
    <Text style={{ color: colors.text }}>
      {workout.name}
    </Text>
  </CardContent>
</Card>
```

#### Per-Screen Checklist:
- [ ] Import useTheme hook
- [ ] Replace hardcoded colors with theme colors
- [ ] Convert layout styles to Tailwind classes
- [ ] Update buttons to use Button component
- [ ] Update cards to use Card component
- [ ] Update inputs to use Input component
- [ ] Test dark/light mode toggle
- [ ] Test all interactions and navigation

---

### Phase 4: Special Cases

#### React Native Chart Kit
Keep as-is, but theme the config:
```typescript
const { colors, isDark } = useTheme();

const chartConfig = {
  backgroundColor: colors.card,
  backgroundGradientFrom: isDark ? colors.card : '#e3f2fd',
  color: (opacity = 1) => colors.primary,
  labelColor: (opacity = 1) => colors.text,
  // ...
};
```

#### Swipeable Components
Wrap reusables with existing Swipeable pattern:
```typescript
import { Swipeable } from 'react-native-gesture-handler';
import { Card } from './ui/card';

<Swipeable {...getSwipeableProps(id)}>
  <Card>
    {/* Content */}
  </Card>
</Swipeable>
```

#### React Navigation Theme
Bridge between React Navigation theme and app theme:
```typescript
import { useTheme as useNavTheme } from '@react-navigation/native';
import { useTheme as useAppTheme } from '../context/ThemeContext';

// Use both where needed
const navColors = useNavTheme().colors;
const appColors = useAppTheme().colors;
```

---

## Component Mapping Guide

| Current Pattern | Migrates To | Notes |
|----------------|-------------|-------|
| `<TouchableOpacity style={styles.button}>` | `<Button>` | Use variant="default/outline/ghost" |
| `<View style={styles.card}>` | `<Card><CardContent>` | Built-in shadow/border |
| `<TextInput style={styles.input}>` | `<Input>` | Built-in focus states |
| Custom modal | `<Dialog>` or `<Sheet>` | Bottom sheet vs centered modal |
| Custom avatar | `<Avatar>` | Handles fallback automatically |
| Badge/chip | `<Badge>` | Multiple variants |

---

## Design System Additions

**Create:** `frontend/src/lib/constants/typography.ts`
```typescript
export const Typography = {
  heading1: { fontSize: 32, fontWeight: '800' as const },
  heading2: { fontSize: 28, fontWeight: '700' as const },
  heading3: { fontSize: 24, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
} as const;
```

**Create:** `frontend/src/lib/constants/shadows.ts`
```typescript
export const Shadows = {
  light: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    // ... lg
  },
  dark: {
    // ... similar structure
  },
} as const;
```

---

## Risk Mitigation

### Main Risks & Solutions

**Risk 1: Breaking Existing Functionality**
- ✅ Migrate one screen at a time
- ✅ Keep old StyleSheet code commented initially
- ✅ Manual QA after each screen

**Risk 2: Performance Regression**
- ✅ react-native-reusables is lightweight
- ✅ Profile with React DevTools
- ✅ Baseline metrics before migration

**Risk 3: Dark/Light Mode Inconsistencies**
- ✅ Centralized ThemeContext ensures consistency
- ✅ Toggle dark/light on each migrated screen
- ✅ Every color must use theme colors

**Risk 4: Learning Curve**
- ✅ Start with simple screens (NotFound, Login)
- ✅ Create internal migration guide from first few screens

---

## Testing Strategy

### Per-Screen Testing:
- [ ] Visual: All elements render correctly
- [ ] Dark Mode: Toggle and verify colors
- [ ] Light Mode: Toggle and verify colors
- [ ] Interactions: Buttons/inputs work
- [ ] Navigation: All flows work
- [ ] Gestures: Swipes, scrolls (if applicable)
- [ ] Forms: Validation works (if applicable)
- [ ] Performance: No lag

### Integration Testing:
- Test full workout flow (Workout → ExerciseSelect → ExerciseDetail → WorkoutSummary → WorkoutComplete)
- Test social flow (Social → Profile → Follow modal)
- Test history flow (History → PR → DetailedHistory)
- Test context persistence

---

## Post-Migration Cleanup (Week 4)

1. **Remove Unused Styles:**
   - Search for remaining StyleSheet.create instances
   - Delete unused style definitions
   - Remove old color constants

2. **Consolidate Theme:**
   - Audit hardcoded colors
   - Move to centralized theme
   - Document exceptions

3. **Performance Audit:**
   - Profile bundle size (before/after)
   - Measure render performance
   - Optimize regressions

4. **Documentation:**
   - Create design system README
   - Document component usage
   - Create component examples

---

## Critical Files

### Foundation Files (Phase 0):
- `frontend/src/App.tsx` - Add ThemeProvider wrapper
- `frontend/src/context/ThemeContext.tsx` - Create new
- `frontend/src/lib/utils.ts` - Create new
- `frontend/src/lib/constants/colors.ts` - Create new
- `frontend/tailwind.config.js` - Create new
- `frontend/babel.config.js` - Update

### Reference Migration Examples:
- `frontend/src/navigation/screens/Home.tsx` - Medium complexity with charts
- `frontend/src/components/FeedPostCard.tsx` - Reusable component pattern
- `frontend/src/navigation/screens/ExerciseSelect.tsx` - Most complex screen

### Context Compatibility:
- `frontend/src/context/WorkoutContext.tsx` - Must remain compatible

---

## Success Metrics

- [ ] All 17 screens migrated successfully
- [ ] Dark/light mode works consistently
- [ ] No functionality regressions
- [ ] Bundle size increases <15%
- [ ] Developer velocity increases after Week 2
- [ ] 70-80% reduction in custom StyleSheet code

---

## Next Steps When Ready to Execute

1. Create feature branch: `git checkout -b feature/design-system-migration`
2. Complete Phase 0 (foundation setup)
3. Migrate NotFound.tsx as proof of concept
4. Get team review on patterns
5. Proceed with Week 1 batch
6. Deploy incrementally after each week

**Estimated Effort:** 3-4 weeks
**Risk Level:** Low-Medium (gradual approach mitigates risk)
**Impact:** High (consistency, maintainability, developer experience)
