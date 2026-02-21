import { Colors } from "@/constants/Colors";
import { getStoredValues, saveSecurely } from "@/store/storage";
import React, {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useEffect,
  useContext,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { SystemBars } from "react-native-edge-to-edge";

// Types
type ThemeMode = "light" | "dark" | "system";

interface CustomThemeColors {
  primary: string;
  background: string;
  card: string;
  text: string;
  border: string;
  notification: string;
  gray: {
    500: string;
    400: string;
    300: string;
    200: string;
    100: string;
    50: string;
  };
}

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: Dispatch<SetStateAction<ThemeMode>>;
  colors: CustomThemeColors;
  toggleTheme: () => void;
}

// Context
export const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => {},
  colors: {
    primary: Colors.primary,
    background: Colors.darkGray[50],
    card: Colors.darkGray[100],
    text: Colors.white,
    border: Colors.darkGray[200],
    notification: Colors.accent,
    gray: Colors.darkGray,
  },
  toggleTheme: () => {},
});

// Theme definitions
const customDarkTheme: CustomThemeColors = {
  primary: Colors.primary,
  background: Colors.darkGray[50],
  card: Colors.darkGray[100],
  text: Colors.white,
  border: Colors.darkGray[200],
  notification: Colors.accent,
  gray: Colors.darkGray,
};

const customLightTheme: CustomThemeColors = {
  primary: Colors.primary,
  background: Colors.white,
  card: Colors.lightGray[100],
  text: Colors.black,
  border: Colors.lightGray[300],
  notification: Colors.accent,
  gray: Colors.lightGray,
};

// Provider Component
export const ThemeProvider: React.FC<PropsWithChildren<{}>> = ({
  children,
}) => {
  const getInitialTheme = (): ThemeMode => {
    const storedTheme = getStoredValues(["theme"]).theme;
    if (
      storedTheme === "light" ||
      storedTheme === "dark" ||
      storedTheme === "system"
    ) {
      return storedTheme;
    }
    return "dark";
  };

  // Load saved theme or default to 'dark'
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const systemScheme = useColorScheme();

  useEffect(() => {
    saveSecurely([{ key: "theme", value: theme }]);
  }, [theme]);

  // Toggle between light and dark themes
  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  }, []);

  // Resolve actual theme (light/dark) based on user choice or system setting
  const resolvedTheme = useMemo<ThemeMode>(() => {
    const normalizedSystemTheme: ThemeMode =
      systemScheme === "light" ? "light" : "dark";
    return theme === "system" ? normalizedSystemTheme : theme;
  }, [theme, systemScheme]);

  // Select color palette
  const colors = useMemo<CustomThemeColors>(
    () => (resolvedTheme === "dark" ? customDarkTheme : customLightTheme),
    [resolvedTheme]
  );
  const contextValue = useMemo<ThemeContextType>(
    () => ({ theme, setTheme, colors, toggleTheme }),
    [theme, colors, toggleTheme]
  );

  return (
    <>
      <ThemeContext.Provider value={contextValue}>
        {children}
      </ThemeContext.Provider>
      <SystemBars style={resolvedTheme === "dark" ? "light" : "dark"} />
    </>
  );
};

// Hook
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
