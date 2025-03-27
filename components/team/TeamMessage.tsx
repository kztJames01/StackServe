import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { formatDateTime } from '../../lib/utils';
import { UserIcon } from '../Icon';



const TeamMessageChannel: React.FC<TeamMessageChannelProps> = ({ teamId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', description: '' });
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!teamId) return;
    
    // Fetch channels
    const fetchChannels = async () => {
      try {
        const channelsQuery = query(
          collection(db, 'channels'),
          where('teamId', '==', teamId),
          orderBy('createdAt', 'asc')
        );
        
        const unsubscribe = onSnapshot(channelsQuery, (snapshot) => {
          const channelsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          })) as Channel[];
          
          setChannels(channelsData);
          
          // Select the first channel if none is selected
          if (channelsData.length > 0 && !selectedChannel) {
            setSelectedChannel(channelsData[0].id);
          }
        });
        
        return unsubscribe;
      } catch (error) {
        console.error('Error fetching channels:', error);
        return () => {};
      }
    };
    
    const unsubscribeFromChannels = fetchChannels();
    
    return () => {
      unsubscribeFromChannels.then(unsubscribe => unsubscribe());
    };
  }, [teamId]);

  useEffect(() => {
    if (!selectedChannel) return;
    
    // Fetch messages for the selected channel
    const fetchMessages = async () => {
      try {
        const messagesQuery = query(
          collection(db, 'messages'),
          where('channelId', '==', selectedChannel),
          orderBy('timestamp', 'asc')
        );
        
        const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
          const messagesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date(),
          })) as Message[];
          
          setMessages(messagesData);
          
          // Fetch user profiles for all unique senders
          const senderIds = [...new Set(messagesData.map(msg => msg.sender))];
          
          for (const senderId of senderIds) {
            if (!userProfiles[senderId]) {
              const userQuery = query(collection(db, 'users'), where('uid', '==', senderId));
              const userSnapshot = await getDocs(userQuery);
              
              if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data();
                setUserProfiles(prev => ({
                  ...prev,
                  [senderId]: userData
                }));
              }
            }
          }
        });
        
        return unsubscribe;
      } catch (error) {
        console.error('Error fetching messages:', error);
        return () => {};
      }
    };
    
    const unsubscribeFromMessages = fetchMessages();
    
    return () => {
      unsubscribeFromMessages.then(unsubscribe => unsubscribe());
    };
  }, [selectedChannel, userProfiles]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !auth.currentUser || !selectedChannel) return;
    
    try {
      const userProfile = userProfiles[auth.currentUser.uid] || {};
      const senderName = `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Team Member';
      
      // Add message to Firestore
      await addDoc(collection(db, 'messages'), {
        content: input,
        sender: auth.currentUser.uid,
        senderName,
        channelId: selectedChannel,
        teamId,
        timestamp: serverTimestamp(),
      });
      
      setInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newChannel.name.trim() || !auth.currentUser) return;
    
    try {
      // Add channel to Firestore
      await addDoc(collection(db, 'channels'), {
        name: newChannel.name,
        description: newChannel.description,
        teamId,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      
      setNewChannel({ name: '', description: '' });
      setIsAddingChannel(false);
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  const selectedChannelData = channels.find(c => c.id === selectedChannel);

  return (
    <div className="h-full flex">
      {/* Channels Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-medium">Channels</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {channels.map(channel => (
              <li key={channel.id}>
                <button
                  onClick={() => setSelectedChannel(channel.id)}
                  className={`w-full text-left px-3 py-2 rounded ${
                    selectedChannel === channel.id
                      ? 'bg-gray-700'
                      : 'hover:bg-gray-700'
                  }`}
                >
                  # {channel.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => setIsAddingChannel(true)}
            className="w-full flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>Add Channel</span>
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedChannelData ? (
          <>
            {/* Channel Header */}
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">#{selectedChannelData.name}</h2>
              {selectedChannelData.description && (
                <p className="text-sm text-gray-500 mt-1">{selectedChannelData.description}</p>
              )}
            </div>
            
            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map(message => {
                  const sender = userProfiles[message.sender] || {};
                  const initials = `${sender.firstName?.[0] || ''}${sender.lastName?.[0] || ''}`.toUpperCase();
                  
                  return (
                    <div key={message.id} className="flex space-x-3">
                      <div className="flex-shrink-0">
                        {sender.photoURL ? (
                          <img
                            src={sender.photoURL}
                            alt={message.senderName}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-800 font-medium">
                            {initials || <UserIcon className="h-6 w-6 text-orange-500" />}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-baseline">
                          <span className="font-medium text-gray-900">{message.senderName}</span>
                          <span className="ml-2 text-xs text-gray-500">{formatDateTime(message.timestamp).time}</span>
                        </div>
                        <div className="mt-1 text-gray-700">{message.content}</div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input */}
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Message #${selectedChannelData.name}`}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
                  disabled={!input.trim()}
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>Select a channel or create a new one</p>
          </div>
        )}
      </div>
      
      {/* Add Channel Modal */}
      {isAddingChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create New Channel</h2>
            <form onSubmit={handleAddChannel}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Channel Name</label>
                  <input
                    type="text"
                    value={newChannel.name}
                    onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                  <textarea
                    value={newChannel.description}
                    onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddingChannel(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMessageChannel;
