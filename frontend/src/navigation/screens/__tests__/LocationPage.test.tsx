import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { LocationPage } from "../LocationPage";

const mockPush = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ push: mockPush }),
  useRoute: () => ({
    params: { locationId: "loc-1", name: "Iron Temple" },
  }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("../../../components/Text", () => ({
  Text: jest.requireActual("react-native").Text,
}));
// Tappable stand-in so avatar-stack presses can be asserted; labeled
// distinctly from the train-here line's username text.
jest.mock("../../../components/Avatar", () => {
  const ReactMock = require("react");
  const { Text: RNText } = require("react-native");
  return {
    Avatar: ({ username, onPress }: any) =>
      ReactMock.createElement(RNText, { onPress }, `avatar:${username}`),
  };
});
jest.mock("../../../components/WorkoutPlayer", () => ({
  MINI_PLAYER_HEIGHT: 0,
}));
jest.mock("../../../components/CompactPostCard", () => ({
  CompactPostCard: () => null,
}));
jest.mock("../../../components/FeedPostCard", () => ({
  FeedPostCard: () => null,
}));
jest.mock("../../../components/FloatingCloseButton", () => ({
  FloatingCloseButton: () => null,
}));
jest.mock("../../../components/OfflineNotice", () => ({
  OfflineNotice: () => null,
}));
jest.mock("../../../hooks/useTrackTab", () => ({ useTrackTab: () => {} }));
jest.mock("../../../hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => true,
}));
// Stable reference: this hook's result is a useEffect dependency in the
// screen, so returning a fresh function per render would refetch forever.
const mockNormalizeFeedPosts = jest.fn();
jest.mock("../../../context/LikesContext", () => ({
  useNormalizeFeedPosts: () => mockNormalizeFeedPosts,
}));
jest.mock("../../../api/socialFeedApi", () => ({
  socialFeedApi: {
    getLocationPosts: jest.fn().mockResolvedValue({ content: [], last: true }),
  },
}));
jest.mock("../../../api/locationService", () => ({
  getLocationPage: jest.fn(),
}));

const { getLocationPage } = jest.requireMock("../../../api/locationService");

// testers has no display name (falls back to username); joe has one — the
// line shows "testers, Joe and 1 other train here" with 3 total mutuals.
const pageInfo = {
  locationId: "loc-1",
  name: "Iron Temple",
  address: "1 Barbell Way",
  postCount: 9,
  athleteCount: 5,
  viewerWorkoutCount: 0,
  friendsWhoTrainHere: [
    { userId: "u-testers", username: "testers", displayName: null },
    { userId: "u-joe", username: "joe", displayName: "Joe" },
  ],
  friendsWhoTrainHereCount: 3,
};

describe("LocationPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getLocationPage.mockResolvedValue(pageInfo);
  });

  it("opens the lifters list on the Lifters tab from the Lifters stat", async () => {
    await render(<LocationPage />);

    await fireEvent.press(await screen.findByLabelText("View lifters"));

    expect(mockPush).toHaveBeenCalledWith("LocationLifters", {
      locationId: "loc-1",
      name: "Iron Temple",
      initialTab: "lifters",
    });
  });

  it("shows the Lifters stat with the server's viewer-visible count", async () => {
    await render(<LocationPage />);

    expect(await screen.findByText("5")).toBeTruthy();
    expect(screen.getByText("Lifters")).toBeTruthy();
  });

  it("opens the gym's mutuals list from a tapped username in the train-here line", async () => {
    await render(<LocationPage />);

    const mutualsList = [
      "LocationLifters",
      { locationId: "loc-1", name: "Iron Temple", initialTab: "mutuals" },
    ] as const;

    await fireEvent.press(await screen.findByText("testers"));
    expect(mockPush).toHaveBeenLastCalledWith(...mutualsList);

    await fireEvent.press(screen.getByText("Joe"));
    expect(mockPush).toHaveBeenLastCalledWith(...mutualsList);
    expect(mockPush).toHaveBeenCalledTimes(2);
  });

  it("opens the gym's mutuals list from the avatar stack", async () => {
    await render(<LocationPage />);

    await fireEvent.press(await screen.findByText("avatar:testers"));

    expect(mockPush).toHaveBeenCalledWith("LocationLifters", {
      locationId: "loc-1",
      name: "Iron Temple",
      initialTab: "mutuals",
    });
  });

  it("opens the lifters list on the Mutuals tab from the others link", async () => {
    await render(<LocationPage />);

    await fireEvent.press(await screen.findByText("1 other"));

    expect(mockPush).toHaveBeenCalledWith("LocationLifters", {
      locationId: "loc-1",
      name: "Iron Temple",
      initialTab: "mutuals",
    });
  });
});
