'use client'

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth } from '../../lib/firebase';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { UserIcon, UsersIcon, MediaIcon,SaveIcon } from '../Icon';
import TeamProfile from '@/components/team/TeamProfile';
import WorkingSpace from '@/components/team/WorkingSpace';
import AIChatBox from '@/components/team/AIChatBox';
import TeamMessageChannel from '@/components/team/TeamMessage';
import TeamNotes from '@/components/team/TeamNotes';
import TeamMembers from '@/components/team/TeamMembers';

const TeamDashboard = () => {
  const [activeTab, setActiveTab] = useState('workspace');
  const [user, setUser] = useState(null);
  const teamId = useSearchParams().get('teamId');
  const router = useRouter();

  useEffect(() => {
    if(!teamId){
      console.log("No teamId provided");
    }
    // Check if user is authenticated
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser ) {
        setUser(currentUser as any);
      } else {
        router.push('/sign-in');
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (!user) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-16 bg-white shadow-md flex flex-col items-center py-6 space-y-8">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
          <UserIcon className="text-orange-500" />
        </div>
        
        <nav className="flex flex-col space-y-6">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`p-3 rounded-lg ${activeTab === 'profile' ? 'bg-orange-100 text-orange-500' : 'text-gray-500'}`}
          >
            <UsersIcon className="" />
          </button>
          <button 
            onClick={() => setActiveTab('workspace')}
            className={`p-3 rounded-lg ${activeTab === 'workspace' ? 'bg-orange-100 text-orange-500' : 'text-gray-500'}`}
          >
            <MediaIcon className="" />
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={`p-3 rounded-lg ${activeTab === 'ai' ? 'bg-orange-100 text-orange-500' : 'text-gray-500'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.5 2.25m0 0v5.714a2.25 2.25 0 01-1.5 2.25m0 0a24.301 24.301 0 01-4.5 0m0 0v-5.714a2.25 2.25 0 001.5-2.25m-1.5 0v-5.714a2.25 2.25 0 011.5-2.25m0 0a24.301 24.301 0 014.5 0" />
            </svg>
          </button>
          <button 
            onClick={() => setActiveTab('messages')}
            className={`p-3 rounded-lg ${activeTab === 'messages' ? 'bg-orange-100 text-orange-500' : 'text-gray-500'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </button>
          <button 
            onClick={() => setActiveTab('notes')}
            className={`p-3 rounded-lg ${activeTab === 'notes' ? 'bg-orange-100 text-orange-500' : 'text-gray-500'}`}
          >
            <SaveIcon className="" />
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'profile' && <TeamProfile teamId={teamId as string} />}
        {activeTab === 'workspace' && <WorkingSpace teamId={teamId as string} />}
        {activeTab === 'ai' && <AIChatBox teamId={teamId as string} />}
        {activeTab === 'messages' && <TeamMessageChannel teamId={teamId as string} />}
        {activeTab === 'notes' && <TeamNotes teamId={teamId as string} />}
      </div>

      {/* Team Members Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <button className="fixed bottom-6 right-6 bg-orange-500 text-white p-4 rounded-full shadow-lg">
            <UsersIcon className="" />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80">
          <TeamMembers teamId={teamId as string} isAdmin={false} />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TeamDashboard;
