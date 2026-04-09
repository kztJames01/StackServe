"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getFeedPosts } from "@/lib/api/client";
import { CardSection } from "@/components/layout/dashboard-shell";
import { Sparkles, MessageCircle, Share2, Heart, ArrowRight } from "lucide-react";

export default function FeedPage() {
  const { data: posts = [] } = useQuery({
    queryKey: ["feedPosts"],
    queryFn: getFeedPosts,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        {/* Modern Create Post Card */}
        <CardSection tone="white">
          <div className="flex gap-4">
            <Avatar className="size-10 ring-2 ring-[#f8f5f0]">
              <AvatarImage src="/home.jpg" alt="Your avatar" />
              <AvatarFallback className="bg-[#252422] text-[#F5EFE6]">ME</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <textarea
                className="min-h-[80px] w-full resize-none rounded-xl border-0 bg-[#f8f5f0] p-4 text-sm text-[#252422] placeholder:text-[#8a7f72] focus:ring-2 focus:ring-[#bb9457]/30 focus:outline-none transition-all"
                placeholder="Share a project update for founders and collaborators..."
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#8a7f72]">
                  <Sparkles className="size-4" />
                  <span className="text-xs">AI can help you write</span>
                </div>
                <Button className="bg-[#252422] text-[#F5EFE6] hover:bg-[#1a1917] rounded-lg px-6 font-medium transition-all hover:shadow-lg hover:shadow-[#252422]/20">
                  Post
                </Button>
              </div>
            </div>
          </div>
        </CardSection>

        {posts.map((post) => (
          <CardSection key={post.id} tone="white">
            <div className="mb-4 flex items-center gap-3">
              <Avatar className="size-10 ring-2 ring-[#f8f5f0]">
                <AvatarImage src={post.user.avatar} alt={post.user.name} />
                <AvatarFallback className="bg-[#252422] text-[#F5EFE6]">{post.user.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-[#252422]">{post.user.name}</p>
                <p className="text-xs text-[#8a7f72]">{post.date}</p>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-[#252422] leading-tight">{post.caption}</h3>
            <p className="mt-2 text-sm text-[#4a4744] leading-relaxed">{post.description}</p>
            <div className="mt-5 flex items-center gap-6 text-sm">
              <button className="flex items-center gap-2 text-[#8a7f72] hover:text-[#bb9457] transition-colors group">
                <Heart className="size-4 group-hover:scale-110 transition-transform" />
                <span>{post.likes}</span>
              </button>
              <button className="flex items-center gap-2 text-[#8a7f72] hover:text-[#bb9457] transition-colors group">
                <MessageCircle className="size-4 group-hover:scale-110 transition-transform" />
                <span>{post.comments}</span>
              </button>
              <button className="flex items-center gap-2 text-[#8a7f72] hover:text-[#bb9457] transition-colors group">
                <Share2 className="size-4 group-hover:scale-110 transition-transform" />
                <span>{post.shares}</span>
              </button>
            </div>
          </CardSection>
        ))}
      </div>

      <aside className="space-y-4">
        {/* Modern Profile Card */}
        <CardSection tone="brown">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-[#252422]">Profile</h2>
              <p className="mt-1 text-sm text-[#252422]/80 leading-relaxed">Showcase your wins and recruit with clarity.</p>
            </div>
          </div>
          <div className="mt-5 space-y-1">
            <Link 
              href="/profile" 
              className="group flex items-center justify-between py-2.5 text-sm font-medium text-[#252422] hover:text-[#1a1917] transition-colors"
            >
              <span>View profile</span>
              <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Link>
            <Link 
              href="/messages" 
              className="group flex items-center justify-between py-2.5 text-sm font-medium text-[#252422] hover:text-[#1a1917] transition-colors"
            >
              <span>Open messages</span>
              <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Link>
            <Link 
              href="/notifications" 
              className="group flex items-center justify-between py-2.5 text-sm font-medium text-[#252422] hover:text-[#1a1917] transition-colors"
            >
              <span>Review notifications</span>
              <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Link>
          </div>
        </CardSection>

        {/* Modern Founder Actions Card */}
        <CardSection tone="black">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-[#F5EFE6]">Founder Actions</h2>
              <p className="mt-1 text-sm text-[#F5EFE6]/70 leading-relaxed">Pitch investors, recruit teammates, and track delivery.</p>
            </div>
          </div>
          <div className="mt-5 space-y-1">
            <Link 
              href="/investors" 
              className="group flex items-center justify-between py-2.5 text-sm font-medium text-[#F5EFE6]/90 hover:text-[#F5EFE6] transition-colors"
            >
              <span>Investor space</span>
              <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Link>
            <Link 
              href="/recruit" 
              className="group flex items-center justify-between py-2.5 text-sm font-medium text-[#F5EFE6]/90 hover:text-[#F5EFE6] transition-colors"
            >
              <span>Recruit board</span>
              <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Link>
            <Link 
              href="/team/tasks" 
              className="group flex items-center justify-between py-2.5 text-sm font-medium text-[#F5EFE6]/90 hover:text-[#F5EFE6] transition-colors"
            >
              <span>Team tasks</span>
              <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Link>
          </div>
        </CardSection>
      </aside>
    </div>
  );
}
