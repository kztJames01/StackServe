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

declare interface IconProps{
    className?: String
}

declare interface SidebarContextProps{
    isMobile: boolean
    state: 'open' | 'closed';
    openMobile: () => void;
    setOpenMobile: (open: boolean) => void;
}

declare interface CreatePostDrawerProps {
    onClose: () => void;
}

declare interface Note {
    id: number;
    content: string;
    timestamp: string;
}