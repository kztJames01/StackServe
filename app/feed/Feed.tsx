'use client'

import { useState } from 'react';
import { HomeIcon, UsersIcon, BookmarkIcon, CogIcon, BellIcon, MessageIcon } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Mock data
const posts = [
    {
        id: 1,
        user: {
            name: 'Sarah Maker',
            avatar: '/avatars/sarah.png',
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
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('home');

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:block w-64 fixed left-0 top-0 h-full bg-white border-r border-gray-200 p-4">
                <div className="flex items-center gap-3 mb-8">
                    <Avatar>
                        <AvatarImage src="/avatars/sarah.png" alt="Sarah Maker" />
                        <AvatarFallback>SM</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">Sarah Maker</p>
                        <p className="text-gray-500">Maker</p>
                    </div>
                </div>

                <nav className="space-y-2">
                    <button className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg">
                        <HomeIcon className="w-5 h-5" />
                        <span>Home</span>
                    </button>
                    <button className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg">
                        <UsersIcon className="w-5 h-5" />
                        <span>My Projects</span>
                    </button>
                    <button className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg">
                        <BookmarkIcon className="w-5 h-5" />
                        <span>Saved</span>
                    </button>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 lg:mr-72 p-4 lg:p-6">
                {/* Mobile Header */}
                <div className="lg:hidden flex justify-between items-center mb-6">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <MenuIcon className="w-6 h-6" />
                    </button>
                    <Avatar>
                        <AvatarImage src="/avatars/sarah.png" alt="Sarah Maker" />
                        <AvatarFallback>SM</AvatarFallback>
                    </Avatar>
                </div>

                {/* Create Post Card */}
                <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
                    <div className="flex gap-3">
                        <Avatar>
                            <AvatarImage src="/avatars/sarah.png" alt="Sarah Maker" />
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
                                <ImageIcon className="w-5 h-5" />
                            </button>
                            <button className="text-gray-500 hover:text-primary">
                                <VideoIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <button className="bg-primary text-white px-4 py-2 rounded-lg">
                            Post
                        </button>
                    </div>
                </div>

                {/* Posts Feed */}
                {posts.map(post => (
                    <div key={post.id} className="bg-white rounded-xl p-4 shadow-sm mb-6">
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
                                    <LikeIcon className="w-5 h-5" /> {post.likes}
                                </button>
                                <button className="flex items-center gap-2 hover:text-primary">
                                    <CommentIcon className="w-5 h-5" /> {post.comments}
                                </button>
                                <button className="flex items-center gap-2 hover:text-primary">
                                    <ShareIcon className="w-5 h-5" /> {post.shares}
                                </button>
                            </div>
                            <button className="hover:text-primary">
                                <BookmarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </main>

            {/* Profile Bar - Desktop */}
            <aside className="hidden lg:block w-72 fixed right-0 top-0 h-full bg-white border-l border-gray-200 p-4">
                <div className="flex items-center gap-3 mb-6">
                    <Avatar>
                        <AvatarImage src="/avatars/sarah.png" alt="Sarah Maker" />
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
                        <MessageIcon className="w-5 h-5" />
                        <span>Messages</span>
                    </button>
                    <button className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg">
                        <CogIcon className="w-5 h-5" />
                        <span>Settings</span>
                    </button>
                </nav>
            </aside>

            {/* Mobile Bottom Navigation */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
                <div className="flex justify-around p-4">
                    <button className="text-primary">
                        <HomeIcon className="w-6 h-6" />
                    </button>
                    <button>
                        <SearchIcon className="w-6 h-6" />
                    </button>
                    <button>
                        <PlusCircleIcon className="w-6 h-6" />
                    </button>
                    <button>
                        <BellIcon className="w-6 h-6" />
                    </button>
                    <button>
                        <UserIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
}