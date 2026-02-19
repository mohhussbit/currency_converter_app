import AnimatedTouchable from "@/components/AnimatedTouchable";
import AnimatedEntrance from "@/components/AnimatedEntrance";
import { Spacing } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { useAdmin } from "@/context/AdminContext";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import CustomText from "./CustomText";

const AdminLoginModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const { colors } = useTheme();
  const { login } = useAdmin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const success = await login(email, password);

      if (success) {
        setEmail("");
        setPassword("");
        onClose();
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError("Network error");
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <AnimatedEntrance
              style={[styles.modalContent, { backgroundColor: colors.primary }]}
              delay={20}
              distance={10}
              scaleFrom={0.98}
              trigger={visible}
            >
              <View style={styles.header}>
                <CustomText
                  variant="h4"
                  fontWeight="bold"
                  style={{ color: colors.text }}
                >
                  Admin Mode
                </CustomText>
                <AnimatedTouchable onPress={onClose} hitSlop={10} haptic="light">
                  <Ionicons
                    name="close"
                    size={Spacing.iconSize}
                    color={colors.text}
                  />
                </AnimatedTouchable>
              </View>
              <View
                style={[
                  styles.searchContainer,
                  { backgroundColor: colors.background },
                ]}
              >
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholderTextColor={colors.gray[400]}
                />
              </View>
              <View
                style={[
                  styles.searchContainer,
                  { backgroundColor: colors.background },
                ]}
              >
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholderTextColor={colors.gray[400]}
                  secureTextEntry
                />
              </View>

              <AnimatedTouchable
                style={[
                  styles.searchContainer,
                  {
                    backgroundColor: colors.card,
                    justifyContent: "center",
                  },
                ]}
                activeOpacity={1}
                onPress={handleLogin}
                disabled={loading}
                haptic="medium"
              >
                <CustomText style={{ color: colors.text }}>
                  {loading ? "Logging in..." : "Login"}
                </CustomText>
              </AnimatedTouchable>
              {error ? (
                <CustomText style={{ color: "red", marginTop: 8 }}>
                  {error}
                </CustomText>
              ) : null}
            </AnimatedEntrance>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default AdminLoginModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    ...(Platform.OS === "web" && {
      maxWidth: 500,
      marginHorizontal: "auto",
      width: "100%",
    }),
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    borderRadius: Spacing.inputBorderRadius,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.body,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    backgroundColor: "transparent",
    paddingHorizontal: Spacing.inputPadding,
    height: Spacing.inputHeight,
    borderRadius: Spacing.inputBorderRadius,
    gap: Spacing.gap.xs,
  },
});
