import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { LocationLifters } from "../LocationLifters";

const mockPush = jest.fn();
// Mutated per test so each can choose its own entry params.
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
  followUserByUsername: jest.fn(),
  unfollowUser: jest.fn(),
}));
jest.mock("../../../api/locationService", () => ({
  getLocationLifters: jest.fn(),
  getLocationLifterMutuals: jest.fn(),
}));

const { getLocationLifters, getLocationLifterMutuals } = jest.requireMock(
  "../../../api/locationService",
);

const stranger = {
  userId: "u-stranger",
  username: "stranger",
  displayName: "Stranger Danger",
  isFollowing: false,
  followStatus: "NONE",
};
const followed = {
  userId: "u-followed",
  username: "followed",
  displayName: "Followed Friend",
  isFollowing: true,
  followStatus: "ACCEPTED",
};

function setParams(params: Record<string, unknown>) {
  for (const key of Object.keys(mockParams)) delete mockParams[key];
  Object.assign(mockParams, params);
}

describe("LocationLifters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setParams({ locationId: "loc-1", name: "Iron Temple" });
    // The gym's mutuals are always the followed subset of its lifters.
    getLocationLifters.mockResolvedValue([stranger, followed]);
    getLocationLifterMutuals.mockResolvedValue([followed]);
  });

  it("defaults to the Lifters tab, titled with the gym's name, counts matching the lists", async () => {
    await render(<LocationLifters />);

    // Lifters tab active by default: everyone who posted here is listed.
    expect(await screen.findByText("Stranger Danger")).toBeTruthy();
    expect(screen.getByText("Followed Friend")).toBeTruthy();
    expect(screen.getByText("Iron Temple")).toBeTruthy();
    // Tab counts equal the actual list lengths: 2 lifters, 1 mutual.
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("puts Mutuals leftmost of the tabs", async () => {
    await render(<LocationLifters />);
    await screen.findByText("Stranger Danger");

    const labels = screen
      .getAllByText(/^(Mutuals|Lifters)$/)
      .map((node) => node.props.children);
    expect(labels).toEqual(["Mutuals", "Lifters"]);
  });

  it("lands on the Mutuals tab when opened with initialTab mutuals", async () => {
    setParams({
      locationId: "loc-1",
      name: "Iron Temple",
      initialTab: "mutuals",
    });

    await render(<LocationLifters />);

    // Only the followed lifter appears on Mutuals — never a stranger.
    expect(await screen.findByText("Followed Friend")).toBeTruthy();
    expect(screen.queryByText("Stranger Danger")).toBeNull();
  });

  it("switches between tabs, filtering to followed users on Mutuals", async () => {
    await render(<LocationLifters />);
    await screen.findByText("Stranger Danger");

    await fireEvent.press(screen.getByText("Mutuals"));
    expect(screen.queryByText("Stranger Danger")).toBeNull();
    expect(screen.getByText("Followed Friend")).toBeTruthy();

    await fireEvent.press(screen.getByText("Lifters"));
    expect(screen.getByText("Stranger Danger")).toBeTruthy();
  });

  it("opens a tapped row's profile", async () => {
    await render(<LocationLifters />);

    await fireEvent.press(await screen.findByText("Stranger Danger"));

    expect(mockPush).toHaveBeenCalledWith("UserProfile", {
      username: "stranger",
    });
  });

  it("shows the shared empty state when the gym has no mutuals", async () => {
    getLocationLifterMutuals.mockResolvedValue([]);
    setParams({
      locationId: "loc-1",
      name: "Iron Temple",
      initialTab: "mutuals",
    });

    await render(<LocationLifters />);

    expect(await screen.findByText("No mutuals yet")).toBeTruthy();
  });
});
