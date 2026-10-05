export type NavItem = {
  title: string;
  url: string;
  items?: { title: string; url: string }[];
};

export const platformNav: NavItem[] = [
  {
    title: "Workspace",
    url: "/dashboard",
    items: [
      { title: "Shoots", url: "/shoots" },
      { title: "Availability", url: "/availability" },
      { title: "Clearance", url: "/compliance" },
      { title: "Past Shoots", url: "/history" }
    ]
  },
  {
    title: "Roster",
    url: "/roster",
    items: [
      { title: "Performer Roster", url: "/roster" },
      { title: "Workspace Members", url: "/settings/workspace" }
    ]
  },
  {
    title: "Community",
    url: "/messages",
    items: [
      { title: "Crew Chat", url: "/messages" },
      { title: "Notifications", url: "/notifications" },
      { title: "Profile", url: "/profile" }
    ]
  }
];

