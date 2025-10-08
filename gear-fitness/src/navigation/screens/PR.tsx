import {
  TextInput,
  Image,
  StyleSheet,
  View,
  Dimensions,
  useColorScheme,
} from "react-native";
import bench from "../../assets/bench.png";
import squat from "../../assets/squat.png";
import deadlift from "../../assets/deadlift.png";

export function PR() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const rows = [
    { image: bench, text: "BENCH ONE REP MAX: 225LBS" },
    { image: squat, text: "SQUAT ONE REP MAX: 315LBS" },
    { image: deadlift, text: "DEADLIFT ONE REP MAX: 315LB" },
  ];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#121212" : "#fff" },
      ]}
    >
      {rows.map((row, index) => (
        <View
          key={index}
          style={[styles.row, { borderColor: isDark ? "#555" : "#ccc" }]}
        >
          {/* Left cell with image */}
          <View
            style={[
              styles.cell,
              { backgroundColor: isDark ? "#1e1e1e" : "#fff" },
            ]}
          >
            <Image
              source={row.image}
              style={[
                styles.image,
                { tintColor: isDark ? "#fff" : "#000" }, // black in light mode, white in dark mode
              ]}
            />
          </View>

          {/* Right cell with editable text */}
          <View
            style={[
              styles.cell,
              { backgroundColor: isDark ? "#1e1e1e" : "#fff" },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0",
                  color: isDark ? "#fff" : "#000",
                },
              ]}
              defaultValue={row.text}
              multiline
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const screenWidth = Dimensions.get("window").width;
const columnWidth = screenWidth / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flex: 1, // equal height for all rows
    flexDirection: "row",
    borderWidth: 1,
  },
  cell: {
    width: columnWidth,
    borderRightWidth: 1,
    borderColor: "#ccc",
    justifyContent: "center", // vertical center
    alignItems: "center", // horizontal center
  },
  image: {
    width: "80%",
    height: "80%",
    resizeMode: "contain",
  },
  input: {
    width: "90%",
    height: "60%",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 16,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
