declare type NewUserParams = {
    userId: string;
    email: string;
    name: string;
    password: string;
};

declare type LoginUser = {
    email: string;
    password: string;
};

declare type User = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
};

declare type SignUpParams = {
    firstName: string;
    lastName: string;
    confirmPassword: string;
    email: string;
    password: string;
    //phone: string;
};

declare type SearchParamProps = {
    params: { [key: string]: string };
    searchParams: { [key: string]: string | string[] | undefined };
};

declare interface HeaderBoxProps {
    type?: "title" | "greeting";
    title: string;
    subtext: string;
    user?: string;
}

declare interface MobileNavProps {
    user: User;
}

declare interface PaginationProps {
    page: number;
    totalPages: number;
}

declare interface AuthFormProps {
    type: "sign-in" | "sign-up";
}

declare interface UrlQueryParams {
    params: string;
    key: string;
    value: string;
}

declare interface IconProps {
    className?: String
}

declare interface SidebarContextProps {
    isMobile: boolean
    state: 'open' | 'closed';
    openMobile: () => void;
    setOpenMobile: (open: boolean) => void;
}

declare interface CreatePostDrawerProps {
    onClose: () => void;
}





declare interface ContributionGraphProps {
    data: number[];
}

declare type BreadcrumbItemType = {
    title: string;
    href?: string;
}

declare interface NavigatorProps {
    onSideBarOpen: () => void;
    breadcrumbs?: BreadcrumbItemType[];
}


//Team

declare interface TeamProfileProps {
    teamId: string;
}
declare interface WorkingSpaceProps {
    teamId: string;
}

declare interface AIChatBoxProps {
    teamId: string;
}
declare interface TeamNotesProps {
    teamId: string;
}

declare interface Note {
    id: string;
    title: string;
    content: string;
    createdBy: string;
    createdAt: Date;
    teamId: string;
    updatedAt: Date;
    tags: string[];
}
declare interface Project {
    id: string;
    name: string;
    description: string;
    status: 'planning' | 'in-progress' | 'review' | 'completed';
    dueDate: Date;
    createdAt: Date;
    createdBy: string;
    teamId: string;
    tasks: Task[];
}

declare interface Task {
    id: string;
    title: string;
    description: string;
    status: 'todo' | 'in-progress' | 'done';
    assignedTo: string;
    dueDate: Date;
    projectId: string;
    teamId: string;
    createdAt: Date;
    createdBy: string;
  }

declare interface TeamMessageChannelProps {
    teamId: string;
}

declare interface Message {
    id: string;
    content: string;
    sender: string;
    senderName: string;
    timestamp: Date;
    channelId?: string;
    attachments?: string[];
    isAI?: boolean;
}

declare interface Channel {
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
    teamId: string;
    createdBy: string;
}

declare interface TeamMembersProps {
    teamId: string;
    isAdmin: boolean;
}

declare interface TeamMember {
    id: string;
    userId: string;
    role: 'admin' | 'member' | 'guest';
    joinedAt: Date;
    firstName?: string;
    lastName?: string;
    email?: string;
    photoURL?: string;
}

declare interface Message {
    id: string;
    content: string;
    sender: string;
    senderName: string;
    timestamp: Date;
    isAI: boolean;
}

//Creators

declare interface Creator {
    id: string;
    name: string;
    username: string;
    avatar: string;
    project: string;
    skills: string[];
    bio: string;
    image: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    isPublished: boolean;
    isDeleted: boolean;
    isVerified: boolean;
    isFeatured: boolean;
    email: string;
    phone: string;
    location: string;
    website: string;
    github: string;
    linkedin: string;
    twitter: string;
    facebook: string;
    instagram: string;
    youtube: string;
    projects: Project[];
    contributions: Contribution[];
};
declare interface SessionUser {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  }
  
 declare interface ExtendedSession {
    user: SessionUser;
  }