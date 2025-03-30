import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { SearchIcon } from 'lucide-react';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';



const Navigator: React.FC<NavigatorProps> = ({ onSideBarOpen, breadcrumbs=[] }: NavigatorProps) => {
  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden flex justify-between items-center mt-6 mb-4 ml-4">
        <SidebarTrigger />
        <div className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="Search projects, creators, or tags..."
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <SearchIcon className="absolute right-3 top-2.5 w-5 h-5 text-gray-500" />
        </div>
        <button onClick={() => { console.log('Mobile avatar clicked'); onSideBarOpen(); }} className='mr-4'> 
          <Avatar>
            <AvatarImage src="/home.jpg" alt="Profile" />
            <AvatarFallback>SM</AvatarFallback>
          </Avatar>
        </button>
      </div>

      {/* Nav Bar and Search - Desktop */}
      <div className="hidden lg:flex items-center justify-between mt-2 mb-4 ml-4">
        <div className="flex gap-2 m-3 items-center">
          <SidebarTrigger />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.length ? (
                breadcrumbs.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <BreadcrumbItem>
                      {item.href ? (
                        <BreadcrumbLink href={item.href}>{item.title}</BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{item.title}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {idx < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                  </React.Fragment>
                ))
              ) : (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
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
        <button onClick={() => { console.log('Desktop avatar clicked'); onSideBarOpen(); }} className='mr-4'> 
          <Avatar>
            <AvatarImage src="/home.jpg" alt="Profile" />
            <AvatarFallback>SM</AvatarFallback>
          </Avatar>
        </button>
      </div>
    </>
  );
};

export default Navigator;
