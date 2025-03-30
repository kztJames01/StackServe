'use client'

import CreatorProfile from "@/components/creators/CreatorProfile"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function CreatorProfilePage(){
    return (
        <SidebarProvider>
            <CreatorProfile />
        </SidebarProvider>
    )
}