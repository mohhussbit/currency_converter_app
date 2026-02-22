module.exports = {
  root: true,
  extends: ["expo", "prettier"],
  plugins: ["unused-imports", "react-native"],
  ignorePatterns: [
    "node_modules/",
    ".expo/",
    "android/",
    "ios/",
    "dist/",
    "build/",
    "coverage/",
  ],
  rules: {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
      },
    ],
    "react-native/no-unused-styles": "warn",
    "react-native/no-single-element-style-arrays": "warn",
  },
};
