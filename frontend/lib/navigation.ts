export type NavItem = {
  title: string;
  url: string;
  items?: { title: string; url: string }[];
};

export const platformNav: NavItem[] = [
  {
    title: "Workspace",
    url: "/shoots",
    items: [
      { title: "Shoots", url: "/shoots" },
      { title: "Availability", url: "/availability" },
      { title: "Compliance", url: "/compliance" },
      { title: "Past Shoots", url: "/history" }
    ]
  },
  {
    title: "Roster",
    url: "/roster",
    items: [
      { title: "Freelancer Roster", url: "/roster" },
      { title: "Call Sheet", url: "/team/tasks" }
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
  { name: "Editorial Cover Shoot", url: "/projects/editorial-cover-shoot" },
  { name: "Lookbook SS27", url: "/projects/lookbook-ss27" },
  { name: "Product Campaign", url: "/projects/product-campaign" }
];
