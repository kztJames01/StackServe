export type NavItem = {
  title: string;
  url: string;
  items?: { title: string; url: string }[];
};

export const platformNav: NavItem[] = [
  {
    title: "Workspace",
    url: "/explore",
    items: [
      { title: "Explore Feed", url: "/explore" },
      { title: "Project History", url: "/history" },
      { title: "Team Tasks", url: "/team/tasks" }
    ]
  },
  {
    title: "Growth",
    url: "/recruit",
    items: [
      { title: "Recruit Teammates", url: "/recruit" },
      { title: "Investor Space", url: "/investors" }
    ]
  },
  {
    title: "Community",
    url: "/messages",
    items: [
      { title: "Messages", url: "/messages" },
      { title: "Notifications", url: "/notifications" },
      { title: "Profile", url: "/profile" }
    ]
  },
  {
    title: "Settings",
    url: "/settings",
    items: [
      { title: "Account", url: "/account" },
      { title: "Billing", url: "/billing" },
      { title: "Preferences", url: "/settings" }
    ]
  }
];

export const projectNav = [
  { name: "AI Co-Founder Match", url: "/projects/ai-cofounder-match" },
  { name: "Pitch Deck Coach", url: "/projects/pitch-deck-coach" },
  { name: "Founder Journal", url: "/projects/founder-journal" }
];
