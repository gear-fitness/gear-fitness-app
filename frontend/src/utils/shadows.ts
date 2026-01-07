import { Platform, ViewStyle } from 'react-native';

export const createShadow = (
  color: string = '#000',
  offset: { width: number; height: number } = { width: 0, height: 2 },
  opacity: number = 0.1,
  radius: number = 4,
  elevation: number = 3
): ViewStyle => {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: color,
      shadowOffset: offset,
      shadowOpacity: opacity,
      shadowRadius: radius,
    };
  }
  return { elevation };
};

export const shadows = {
  sm: createShadow('#000', { width: 0, height: 1 }, 0.05, 2, 2),
  md: createShadow('#000', { width: 0, height: 2 }, 0.1, 4, 3),
  lg: createShadow('#000', { width: 0, height: 4 }, 0.15, 8, 5),
  glowBlue: createShadow('#007AFF', { width: 0, height: 8 }, 0.4, 20, 8),
  glowOrange: createShadow('#FF6B35', { width: 0, height: 8 }, 0.4, 20, 8),
  dualLayer1: createShadow('#007AFF', { width: 0, height: 12 }, 0.3, 24, 10),
  dualLayer2: createShadow('#007AFF', { width: 0, height: 4 }, 0.5, 12, 6),
};
