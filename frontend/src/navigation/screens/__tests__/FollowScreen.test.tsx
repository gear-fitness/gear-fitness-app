import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import FollowScreen from "../FollowScreen";

const mockPush = jest.fn();
const mockParams: Record<string, unknown> = {};

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ push: mockPush }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("../../../components/Text", () => ({
  Text: jest.requireActual("react-native").Text,
}));
jest.mock("../../../components/Avatar", () => ({ Avatar: () => null }));
jest.mock("../../../components/FloatingCloseButton", () => ({
  FloatingCloseButton: () => null,
}));
jest.mock("../../../hooks/useTrackTab", () => ({ useTrackTab: () => {} }));
jest.mock("../../../context/FollowStatusContext", () => ({
  useFollowStatus: () => ({ overrides: {}, setFollowStatus: jest.fn() }),
}));
jest.mock("../../../api/userService", () => ({
  getCurrentUserProfile: jest.fn().mockResolvedValue({ username: "me" }),
  getUserFollowers: jest.fn(),
  getUserFollowing: jest.fn(),
  getUserMutuals: jest.fn(),
  followUserByUsername: jest.fn(),
  unfollowUser: jest.fn(),
}));

const { getUserFollowers, getUserFollowing, getUserMutuals } = jest.requireMock(
  "../../../api/userService",
);

const row = (username: string, displayName: string) => ({
  userId: `u-${username}`,
  username,
  displayName,
  isFollowing: false,
  followStatus: "NONE",
});

function setParams(params: Record<string, unknown>) {
  for (const key of Object.keys(mockParams)) delete mockParams[key];
  Object.assign(mockParams, params);
}

describe("FollowScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setParams({ userId: "u-alex", username: "alex", initialTab: "followers" });
    getUserFollowers.mockResolvedValue([
      row("f1", "Follower One"),
      row("f2", "Follower Two"),
    ]);
    getUserFollowing.mockResolvedValue([row("g1", "Following One")]);
    // Mutuals as the server defines them: people the viewer follows who also
    // follow this profile's owner. f1 is the overlap here.
    getUserMutuals.mockResolvedValue([
      { ...row("f1", "Follower One"), isFollowing: true, followStatus: "ACCEPTED" },
    ]);
  });

  it("puts Mutuals leftmost of the tabs", async () => {
    await render(<FollowScreen />);
    await screen.findByText("Follower One");

    const labels = screen
      .getAllByText(/^(Mutuals|Followers|Following)$/)
      .map((node) => node.props.children);
    expect(labels).toEqual(["Mutuals", "Followers", "Following"]);
  });

  it("shows a Mutuals tab whose count and rows come from the mutuals list", async () => {
    await render(<FollowScreen />);

    expect(await screen.findByText("Mutuals")).toBeTruthy();
    // Counts equal the loaded list lengths: 2 followers, 1 following,
    // 1 mutual (rendered as two "1" tab counts).
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getAllByText("1")).toHaveLength(2);

    await fireEvent.press(screen.getByText("Mutuals"));
    expect(screen.getByText("Follower One")).toBeTruthy();
    expect(screen.queryByText("Follower Two")).toBeNull();
    expect(screen.queryByText("Following One")).toBeNull();
  });

  it("can open directly on the Mutuals tab", async () => {
    setParams({ userId: "u-alex", username: "alex", initialTab: "mutuals" });

    await render(<FollowScreen />);

    expect(await screen.findByText("Follower One")).toBeTruthy();
    expect(screen.queryByText("Follower Two")).toBeNull();
  });

  it("shows the shared empty state when there are no mutuals", async () => {
    getUserMutuals.mockResolvedValue([]);
    setParams({ userId: "u-alex", username: "alex", initialTab: "mutuals" });

    await render(<FollowScreen />);

    expect(await screen.findByText("No mutuals yet")).toBeTruthy();
  });

  it("opens a tapped mutual's profile", async () => {
    setParams({ userId: "u-alex", username: "alex", initialTab: "mutuals" });

    await render(<FollowScreen />);

    await fireEvent.press(await screen.findByText("Follower One"));

    expect(mockPush).toHaveBeenCalledWith("UserProfile", { username: "f1" });
  });
});
