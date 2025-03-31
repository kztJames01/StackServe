'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { fetchWithAuth } from '../../lib/api';
import { formatDateTime } from '../../lib/utils';

const AIChatBox: React.FC<AIChatBoxProps> = ({ teamId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const { data: session } = useSession();

  useEffect(() => {
    const fetchMessages = async () => {
      if (!teamId) return;
      
      try {
        const response = await fetchWithAuth(`/api/teams/${teamId}/ai-messages`);
        const messagesData = response.data;
        
        setMessages(messagesData);
        
        // Fetch user names for all unique user IDs
        const userIds = [...new Set(messagesData
          .filter(msg => !msg.isAI)
          .map(msg => msg.sender))];
        
        const userNamesMap: Record<string, string> = {};
        
        for (const userId of userIds) {
          const userResponse = await fetchWithAuth(`/api/users/${userId}`);
          
          if (userResponse.data) {
            const userData = userResponse.data;
            userNamesMap[userId as string] = `${userData.firstName} ${userData.lastName}`;
          }
        }
        
        setUserNames(userNamesMap);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [teamId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !session?.user) return;
    
    try {
      setIsLoading(true);
      
      // Add user message to database
      const userMessageResponse = await fetchWithAuth(`/api/teams/${teamId}/ai-messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: input,
          isAI: false
        })
      });
      
      const userMessage = userMessageResponse.data;
      
      // Add the message to the UI immediately
      setMessages(prev => [...prev, userMessage]);
      
      setInput('');
      
      // Request AI response
      const aiResponseData = await fetchWithAuth(`/api/teams/${teamId}/ai-messages/generate`, {
        method: 'POST',
        body: JSON.stringify({
          userMessage: input
        })
      });
      
      // Add AI response to the UI
      setMessages(prev => [...prev, aiResponseData.data]);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <h1 className="text-xl font-semibold">AI Assistant</h1>
        <p className="text-sm text-gray-500">Ask questions and get feedback for your team</p>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-center">No messages yet. Start a conversation with the AI assistant!</p>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.isAI ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-3/4 rounded-lg p-3 ${
                  message.isAI
                    ? 'bg-white border border-gray-200'
                    : 'bg-orange-500 text-white'
                }`}
              >
                <div className="font-medium text-sm">
                  {message.isAI ? 'AI Assistant' : message.senderName || 'You'}
                </div>
                <div className="mt-1">{message.content}</div>
                <div className={`text-xs mt-1 ${message.isAI ? 'text-gray-500' : 'text-orange-100'}`}>
                  {formatDateTime(message.timestamp).time}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="bg-white border-t p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the AI assistant..."
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <span>Send</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChatBox;
