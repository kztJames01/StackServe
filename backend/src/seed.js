const profile = {
  name: 'John Doe',
  bio: 'Founder in Residence | Building products for creators',
  avatar: '/home.jpg',
  skills: ['React', 'TypeScript', 'Node.js', 'Product Strategy'],
  socials: {
    github: 'https://github.com/johndoe',
    linkedin: 'https://linkedin.com/in/johndoe',
    twitter: 'https://twitter.com/johndoe',
  },
};

const projects = [
  {
    id: 1,
    title: 'AI Chatbot',
    description: 'Conversational assistant for startup ops.',
    image: '/home.jpg',
    tags: ['AI', 'Python'],
  },
  {
    id: 2,
    title: 'Founder CRM',
    description: 'Track outreach, investors, and user interviews.',
    image: '/home.jpg',
    tags: ['Next.js', 'Node.js'],
  },
];

const posts = [
  {
    id: 1,
    content: 'Shipped our MVP landing page today.',
    likes: 24,
    comments: 8,
    date: '2 days ago',
  },
];

const feed = [
  {
    id: '1',
    user: { name: 'Sarah Maker', avatar: '/home.jpg', rating: '4.9' },
    date: '2h ago',
    caption: 'Building an AI mentor for early-stage founders',
    description: 'Looking for a UI engineer and a growth operator to join this sprint.',
    likes: 42,
    comments: 15,
    shares: 8,
  },
];

const tasks = [
  {
    id: 'task-1',
    title: 'Draft investor one-pager',
    description: 'Share traction and runway summary.',
    status: 'todo',
    priority: 'high',
    assignedTo: 'current-user',
    teamId: 'default-team',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'Set up onboarding flow',
    description: 'Define first-use activation for new founders.',
    status: 'in-progress',
    priority: 'medium',
    assignedTo: 'current-user',
    teamId: 'default-team',
    createdAt: new Date().toISOString(),
  },
];

module.exports = {
  feed,
  posts,
  profile,
  projects,
  tasks,
};
