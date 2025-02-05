'use client'

import { useState } from 'react';
import {
    HomeIcon, UsersIcon, SaveIcon,
    SettingsIcon, BellIcon, MessageIcon, MediaIcon,
    EngageIcon,
    CommentIcon,
    DashboardIcon
} from '@/components/Icon';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MenuIcon, PlusCircleIcon, SearchIcon, ShareIcon, UserIcon } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from './ui/breadcrumb';
import { isDataView } from 'util/types';
import { CreatePostDrawer } from './PostCreation';

// Mock data
const posts = [
    {
        id: 1,
        user: {
            name: 'Sarah Maker',
            avatar: '/home.jpg',
            rating: '4.9',
        },
        date: '2h ago',
        caption: 'Just prototyped my new robotics project! 🤖',
        description: 'Looking for collaborators with experience in Arduino and mechanical design. Open source project - join me in building the future of educational robotics!',
        likes: 42,
        comments: 15,
        shares: 8
    },
    // Add more posts...
];

export default function FeedPage() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isPostSheetOpen, setIsPostSheetOpen] = useState(false);
    return (
        <SidebarProvider>
            <div className="flex min-h-screen bg-white w-full">
                {/* Sidebar - Desktop */}
                <AppSidebar className="hidden lg:block" />

                {/* Main Content */}
                <main className="flex-1 lg:ml-64 lg:mr-72 p-4 lg:p-6 font-[family-name:var(--font-geist-sans)]">
                    {/* Mobile Header */}
                    <div className="lg:hidden flex justify-between items-center mb-6">
                        
                        <SidebarTrigger />
                       
                        <div className="relative w-full max-w-md">
                            <input
                                type="text"
                                placeholder="Search projects, creators, or tags..."
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <SearchIcon className="absolute right-3 top-2.5 w-5 h-5 text-gray-500" />
                        </div>
                        <button onClick={() => setIsProfileOpen(true)}>
                            <Avatar>
                                <AvatarImage src="/home.jpg" alt="Sarah Maker" />
                                <AvatarFallback>SM</AvatarFallback>
                            </Avatar>
                        </button>
                    </div>

                    {/* Nav Bar and Search - Desktop */}
                    <div className="hidden lg:flex items-center justify-start mb-6">
                        <div className='flex gap-2 m-3 items-center'>
                            <SidebarTrigger />
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink href="/">Home</BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbLink href="/components">Components</BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>
                        <div className="relative w-full max-w-md">
                            <input
                                type="text"
                                placeholder="Search projects, creators, or tags..."
                                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <SearchIcon className="absolute right-3 top-2.5 w-5 h-5 text-gray-500" />
                        </div>
                    </div>

                    {/* Create Post Card */}
                    <div className="bg-white rounded-xl p-4 lg:w-[50vw] z-1 shadow-lg mb-6 lg:mr-120">
                        <div className="flex gap-3">
                            <Avatar>
                                <AvatarImage src="/home.jpg" alt="Sarah Maker" />
                                <AvatarFallback>SM</AvatarFallback>
                            </Avatar>
                            <textarea
                                className="flex-1 rounded-lg p-3 resize-none"
                                placeholder="Share your project update..."
                                rows={1}
                                onClick={() => setIsDrawerOpen(true)}
                                readOnly
                            />
                            <button className="text-gray-500 hover:text-primary">
                                <MediaIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {isDrawerOpen && (
                        <CreatePostDrawer onClose={() => setIsDrawerOpen(false)} />
                    )}
                    {/* Posts Feed */}
                    {posts.map(post => (
                        <div key={post.id} className="shadow-lg rounded-xl lg:w-[50vw] p-4 mb-6">
                            {/* Post Header */}
                            <div className="flex items-center gap-3 mb-4">
                                <Avatar>
                                    <AvatarImage src={post.user.avatar} alt="Sarah Maker" />
                                    <AvatarFallback>SM</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold">{post.user.name}</h3>
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                            ★ {post.user.rating}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500">{post.date}</p>
                                </div>
                            </div>

                            {/* Post Content */}
                            <p className="font-medium mb-2">{post.caption}</p>
                            <p className="text-gray-600 mb-4">{post.description}</p>

                            {/* Engagement Buttons */}
                            <div className="flex justify-between items-center text-gray-500">
                                <div className="flex gap-4">
                                    <button className="flex items-center gap-2 hover:text-primary">
                                        <EngageIcon className="w-5 h-5" /> {post.likes}
                                    </button>
                                    <button className="flex items-center gap-2 hover:text-primary">
                                        <CommentIcon className="w-5 h-5" /> {post.comments}
                                    </button>
                                    <button className="flex items-center gap-2 hover:text-primary">
                                        <ShareIcon className="w-5 h-5" /> {post.shares}
                                    </button>
                                </div>
                                <button className="hover:text-primary">
                                    <SaveIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </main>

                {/* Profile Bar - Desktop */}
                <aside className="hidden lg:block w-72 fixed right-0 top-0 h-full bg-white border-l border-gray-200 p-4">
                    <div className="flex items-center gap-3 mb-6">
                        <Avatar>
                            <AvatarImage src="/home.jpg" alt="Sarah Maker" />
                            <AvatarFallback>SM</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="font-bold">Your Profile</h2>
                            <p className="text-sm text-gray-500">Active Contributor ★4.8</p>
                        </div>
                    </div>

                    <nav className="space-y-2">
                        <button className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg">
                            <UserIcon className="w-5 h-5" />
                            <span>Profile</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg">
                            <DashboardIcon className="w-5 h-5" />
                            <span>Dashboard</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg">
                            <BellIcon className="w-5 h-5" />
                            <span>Notifications</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg">
                            <MessageIcon className="w-5 h-5" />
                            <span>Messages</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg">
                            <SettingsIcon className="w-5 h-5" />
                            <span>Settings</span>
                        </button>
                    </nav>
                </aside>

                {/* Profile Sidebar Sheet - Mobile */}
                {isProfileOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setIsProfileOpen(false)}>
                        <div className="fixed right-0 top-0 h-full w-72 bg-white p-4">
                            <div className="flex items-center gap-3 mb-6">
                                <Avatar>
                                    <AvatarImage src="/home.jpg" alt="Sarah Maker" />
                                    <AvatarFallback>SM</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h2 className="font-bold">Your Profile</h2>
                                    <p className="text-sm text-gray-500">Active Contributor ★4.8</p>
                                </div>
                            </div>
                            <nav className="space-y-2">
                                <button className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg">
                                    <UserIcon className="w-5 h-5" />
                                    <span>Profile</span>
                                </button>
                                <button className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg">
                                    <DashboardIcon className="w-5 h-5" />
                                    <span>Dashboard</span>
                                </button>
                                <button className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg">
                                    <BellIcon className="w-5 h-5" />
                                    <span>Notifications</span>
                                </button>
                                <button className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg">
                                    <MessageIcon className="w-5 h-5" />
                                    <span>Messages</span>
                                </button>
                                <button className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg">
                                    <SettingsIcon className="w-5 h-5" />
                                    <span>Settings</span>
                                </button>
                            </nav>
                        </div>
                    </div>
                )}

                {/* Post Card Sheet - Mobile */}
                {isPostSheetOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setIsPostSheetOpen(false)}>
                        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 rounded-t-lg">
                            <div className="flex gap-3">
                                <Avatar>
                                    <AvatarImage src="/home.jpg" alt="Sarah Maker" />
                                    <AvatarFallback>SM</AvatarFallback>
                                </Avatar>
                                <textarea
                                    className="flex-1 border rounded-lg p-3 resize-none"
                                    placeholder="Share your project update..."
                                    rows={2}
                                />
                            </div>
                            <div className="flex justify-between items-center mt-4">
                                <div className="flex gap-3">
                                    <button className="text-gray-500 hover:text-primary">
                                        <MediaIcon className="w-5 h-5" />
                                    </button>
                                    <button className="text-gray-500 hover:text-primary">
                                        <MediaIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                <button className="bg-primary text-white px-4 py-2 rounded-lg">
                                    Post
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </SidebarProvider>
    );
}