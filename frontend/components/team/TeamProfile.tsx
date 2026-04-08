'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';



const TeamProfile: React.FC<TeamProfileProps> = ({ teamId }) => {
  const [team, setTeam] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mission: '',
    vision: '',
    goals: '',
    industry: '',
  });

  useEffect(() => {
    const fetchTeam = async () => {
      if (!teamId) return;
      
      try {
        const teamDoc = await getDoc(doc(db, 'teams', teamId));
        if (teamDoc.exists()) {
          const teamData = teamDoc.data();
          setTeam(teamData);
          setFormData({
            name: teamData.name || '',
            description: teamData.description || '',
            mission: teamData.mission || '',
            vision: teamData.vision || '',
            goals: teamData.goals || '',
            industry: teamData.industry || '',
          });
        }
      } catch (error) {
        console.error('Error fetching team:', error);
      }
    };

    fetchTeam();
  }, [teamId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateDoc(doc(db, 'teams', teamId), formData);
      setTeam({ ...team, ...formData });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  if (!team) return <div className="flex items-center justify-center h-full">Loading team profile...</div>;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        {/* Team Header */}
        <div className="relative h-48 bg-gradient-to-r from-orange-400 to-orange-600">
          <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/50 to-transparent">
            <h1 className="text-3xl font-bold text-white">{team.name}</h1>
            <p className="text-white/80">{team.industry}</p>
          </div>
          
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Team Content */}
        <div className="p-6">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Team Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Industry</label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Mission</label>
                <textarea
                  name="mission"
                  value={formData.mission}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Vision</label>
                <textarea
                  name="vision"
                  value={formData.vision}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Goals</label>
                <textarea
                  name="goals"
                  value={formData.goals}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">About Our Team</h2>
                <p className="mt-2 text-gray-600">{team.description || "No description available."}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-orange-800">Our Mission</h3>
                  <p className="mt-2 text-gray-600">{team.mission || "No mission statement available."}</p>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-orange-800">Our Vision</h3>
                  <p className="mt-2 text-gray-600">{team.vision || "No vision statement available."}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-800">Goals</h3>
                <p className="mt-2 text-gray-600">{team.goals || "No goals available."}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamProfile;
