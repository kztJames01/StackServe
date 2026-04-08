'use client';

import ProfilePage from "@/components/Profile";
import {

  SidebarProvider,

} from "@/components/ui/sidebar"

export default function Profile() {
  return (
    <SidebarProvider>
      <ProfilePage/>
    </SidebarProvider>
  )
}
