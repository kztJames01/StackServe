'use client'

import FindCreatorsPage from "@/components/creators/Find"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function FindCreators(){
    return (
        <SidebarProvider>
            <FindCreatorsPage />
        </SidebarProvider>
    )
}
