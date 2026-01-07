module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      "babel-preset-expo"
    ],
    plugins: [
      // Path alias support (@/utils/shadows)
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
          },
        },
      ],
      // NativeWind
      "nativewind/babel",
      // Reanimated MUST be last
      "react-native-reanimated/plugin",
    ],
  };
};
