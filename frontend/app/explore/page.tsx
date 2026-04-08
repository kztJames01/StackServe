'use client';

import { SidebarProvider } from '@/components/ui/sidebar';
import FeedPage from '@/components/Feed';

export default function ExplorePage() {
    return (
        <SidebarProvider>
            <FeedPage />
        </SidebarProvider>
    );
}