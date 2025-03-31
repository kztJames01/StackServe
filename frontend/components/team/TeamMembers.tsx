'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { fetchWithAuth } from '../../lib/api';
import { UsersIcon, UserIcon, PlusIcon } from '../Icon';

const TeamMembers: React.FC<TeamMembersProps> = ({ teamId, isAdmin }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'guest'>('member');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!teamId) return;
      
      try {
        const response = await fetchWithAuth(`/api/teams/${teamId}/members`);
        setMembers(response.data);
      } catch (error) {
        console.error('Error fetching team members:', error);
      }
    };
    
    fetchTeamMembers();
  }, [teamId]);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.trim() || !session) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetchWithAuth(`/api/teams/${teamId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole
        })
      });
      
      // Add new member to the state
      setMembers(prev => [...prev, response.data]);
      
      setSuccess(`${response.data.firstName} ${response.data.lastName} has been added to the team`);
      setInviteEmail('');
      setIsInviting(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error inviting member:', error);
      setError(error.message || 'An error occurred while inviting the member');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!isAdmin || !session) return;
    
    if (window.confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      try {
        await fetchWithAuth(`/api/teams/${teamId}/members/${memberId}`, {
          method: 'DELETE'
        });
        
        // Remove member from state
        setMembers(prev => prev.filter(member => member.id !== memberId));
        
        setSuccess(`${memberName} has been removed from the team`);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } catch (error: any) {
        console.error('Error removing member:', error);
        setError(error.message || 'An error occurred while removing the member');
        
        // Clear error message after 3 seconds
        setTimeout(() => {
          setError(null);
        }, 3000);
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <UsersIcon className="text-gray-500" />
          <h1 className="text-xl font-semibold">Team Members</h1>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => setIsInviting(true)}
            className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md"
          >
            <PlusIcon className="" />
            <span>Invite Member</span>
          </button>
        )}
      </div>
      
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mx-4 mt-4">
          {success}
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-4 mt-4">
          {error}
        </div>
      )}
      
      {/* Members List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(member => {
            const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Team Member';
            const initials = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase();
            
            return (
              <div key={member.userId} className="bg-gray-50 rounded-lg p-4 flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {member.photoURL ? (
                    <img
                      src={member.photoURL}
                      alt={fullName}
                      className="h-12 w-12 rounded-full"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-800 font-medium">
                      {initials || <UserIcon className="h-6 w-6 text-orange-500" />}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{fullName}</div>
                  <div className="text-sm text-gray-500">{member.email}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      member.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : member.role === 'member'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </span>
                    
                    {isAdmin && session?.user?.id !== member.userId && (
                      <button
                        onClick={() => handleRemoveMember(member.userId, fullName)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}        </div>
      </div>
      
      {/* Invite Member Modal */}
      {isInviting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Invite Team Member</h2>
            <form onSubmit={handleInviteMember}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    The user must already have an account in the system
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsInviting(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Inviting...' : 'Invite Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMembers;
