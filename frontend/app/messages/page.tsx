'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';
import { getConversations, getMessages, sendMessage } from '@/lib/api/client';

export default function Page() {
  const queryClient = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [content, setContent] = useState('');

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', activeConvId],
    queryFn: () => getMessages(activeConvId!),
    enabled: !!activeConvId,
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) => {
      const conv = conversations.find((c) => c.id === activeConvId);
      const other = conv?.participants[0];
      return sendMessage({ conversationId: activeConvId!, receiverId: other?.id ?? '', content: text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', activeConvId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setContent('');
    },
  });

  return (
    <DashboardShell title="Messages" description="Direct conversations with founders, teammates, and partners.">
      <CardSection tone="white">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading conversations…</p>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conversations yet.</p>
        ) : (
          <div className="flex gap-4 h-[520px]">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0 border-r pr-4 overflow-y-auto space-y-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full text-left rounded-lg p-3 transition-colors ${
                    activeConvId === conv.id ? 'bg-muted font-semibold' : 'hover:bg-muted/50'
                  }`}
                >
                  <p className="text-sm font-medium truncate">
                    {conv.participants.map((p) => p.name).join(', ')}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                  {conv.unreadCount > 0 && (
                    <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Thread */}
            <div className="flex-1 flex flex-col gap-3 overflow-hidden">
              {activeConvId ? (
                <>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {messages.map((msg) => (
                      <div key={msg.id} className="rounded-lg border p-3">
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 border rounded-md px-3 py-2 text-sm"
                      placeholder="Write a message…"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && content.trim()) sendMutation.mutate(content.trim());
                      }}
                    />
                    <button
                      className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm disabled:opacity-50"
                      disabled={!content.trim() || sendMutation.isPending}
                      onClick={() => sendMutation.mutate(content.trim())}
                    >
                      Send
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground m-auto">Select a conversation.</p>
              )}
            </div>
          </div>
        )}
      </CardSection>
    </DashboardShell>
  );
}


