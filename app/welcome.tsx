import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
    Dimensions,
    ImageBackground,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();

  const handleBegin = () => {
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Imagen de fondo con blur */}
      <ImageBackground
        source={require("@/assets/images/partial-react-logo.png")}
        style={styles.backgroundImage}
        blurRadius={10}
      >
        <View style={styles.blurContainer}>
          <View style={styles.content}>
            {/* Logo en la parte superior */}
            <View style={styles.logoContainer}>
              <Image
                source={require("@/assets/images/partial-react-logo.png")}
                style={styles.logo}
              />
            </View>

            {/* Texto de bienvenida */}
            <View style={styles.textContainer}>
              <Text style={styles.welcomeText}>¡Bienvenido!</Text>
              <Text style={styles.subtitleText}>a CanchaYa</Text>
            </View>

            {/* Botón Comenzar */}
            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleBegin}
            >
              <Text style={styles.buttonText}>Comenzar</Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  blurContainer: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 40,
  },
  content: {
    flex: 1,
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logoContainer: {
    flex: 0.3,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: "contain",
  },
  textContainer: {
    flex: 0.4,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitleText: {
    fontSize: 28,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    opacity: 0.9,
  },
  button: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 60,
    paddingVertical: 16,
    borderRadius: 50,
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  buttonPressed: {
    backgroundColor: "#FFC700",
    transform: [{ scale: 0.95 }],
  },
  buttonText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
  },
});
