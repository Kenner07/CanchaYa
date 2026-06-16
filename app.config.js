const appJson = require("./app.json");

module.exports = {
  ...appJson.expo,
  ios: {
    ...appJson.expo.ios,
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    },
  },
  android: {
    ...appJson.expo.android,
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      },
    },
  },
};
