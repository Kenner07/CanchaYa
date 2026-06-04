import { Dimensions, StyleSheet } from "react-native";

const { width } = Dimensions.get("window");

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  brandText: {
    color: "#FFD700",
    fontSize: 24,
    fontWeight: "800",
  },
  greeting: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  heading: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32,
  },
  topIcons: {
    flexDirection: "row",
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  mapCard: {
    borderRadius: 20,
    backgroundColor: "#111",
    padding: 16,
    marginBottom: 28,
  },
  mapHeader: {
    marginBottom: 14,
  },
  mapLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  mapSubLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 4,
  },
  mapPlaceholder: {
    height: 220,
    borderRadius: 18,
    backgroundColor: "#101010",
    overflow: "hidden",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapPlaceholderText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    position: "absolute",
    bottom: 16,
  },
  pinRow: {
    width: "100%",
    height: "100%",
  },
  pin1: {
    position: "absolute",
    top: "26%",
    left: "42%",
  },
  pin2: {
    position: "absolute",
    top: "45%",
    left: "28%",
  },
  pin3: {
    position: "absolute",
    top: "60%",
    left: "60%",
  },
  sectionHeader: {
    marginBottom: 18,
    marginTop: 8,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  cardList: {
    paddingVertical: 8,
  },
  card: {
    width: width * 0.72,
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: "#0d0d0d",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardImage: {
    width: "100%",
    height: 120,
    justifyContent: "flex-end",
  },
  cardImageInner: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  cardBadge: {
    alignSelf: "flex-start",
    margin: 12,
    backgroundColor: "rgba(76, 175, 80, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cardBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  cardContent: {
    padding: 14,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardRating: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  cardDistance: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "500",
  },
  detailButton: {
    backgroundColor: "#FFD700",
    borderRadius: 18,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  detailButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "800",
  },
  avatarContainer: {
    position: "relative",
  },
  dropdownMenu: {
    position: "absolute",
    top: 50,
    right: 0,
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  menuItemText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 4,
  },
});
