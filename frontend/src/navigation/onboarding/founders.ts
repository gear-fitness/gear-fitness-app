/** Curated accounts surfaced on the social/accountability step. Real user
 *  search needs auth, which the user doesn't have yet during onboarding, so
 *  these handles are queued in the draft and followed right after sign-up.
 *  Update the usernames to match the real founder/ambassador accounts. */
export interface SuggestedAccount {
  username: string;
  name: string;
  blurb: string;
  emoji: string;
}

export const FOUNDER_ACCOUNTS: SuggestedAccount[] = [
  {
    username: "gear",
    name: "Gear",
    blurb: "Official account — tips, challenges, and updates",
    emoji: "⚙️",
  },
  {
    username: "founders",
    name: "The Founders",
    blurb: "Building Gear in public — follow the journey",
    emoji: "🚀",
  },
  {
    username: "gearcoach",
    name: "Gear Coach",
    blurb: "Weekly programming and form breakdowns",
    emoji: "🏋️",
  },
];
