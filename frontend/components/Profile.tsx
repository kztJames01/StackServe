"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import CalendarHeatMap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CardSection } from "@/components/layout/dashboard-shell";
import { getProfile } from "@/lib/api/client";

const fetchContributions = async () => {
  const data: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = 365; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const count = Math.random() > 0.7 ? Math.floor(Math.random() * 10) : 0;
    if (count > 0) {
      data.push({ date: date.toISOString().split("T")[0], count });
    }
  }
  return data;
};

export default function ProfilePage() {
  const { data: user } = useQuery({
    queryKey: ["userProfile"],
    queryFn: getProfile,
  });

  const { data: contributions } = useQuery({
    queryKey: ["contributions"],
    queryFn: fetchContributions,
  });

  return (
    <div className="space-y-6">
      <CardSection tone="white">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.avatar || "/home.jpg"} />
              <AvatarFallback>{user?.name?.slice(0, 2) || "FN"}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-semibold">{user?.name || "Founder"}</h2>
              <p className="text-sm text-neutral-600">{user?.bio || "Founder in Residence"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={user?.socials.github || "#"}>GitHub</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={user?.socials.linkedin || "#"}>LinkedIn</Link>
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(user?.skills || []).map((skill) => (
            <span key={skill} className="rounded-full bg-[#BB9457]/25 px-3 py-1 text-xs font-medium text-[#252422]">
              {skill}
            </span>
          ))}
        </div>
      </CardSection>

      <CardSection tone="black">
        <h3 className="text-lg font-semibold">Contributions</h3>
        <p className="mb-4 mt-1 text-sm text-[#F5EFE6]/80">Your activity over the past year.</p>
        <div className="overflow-x-auto">
          <CalendarHeatMap
            values={contributions || []}
            classForValue={(value) => {
              if (!value) return "color-empty";
              if (value.count >= 8) return "color-scale-4";
              if (value.count >= 5) return "color-scale-3";
              if (value.count >= 2) return "color-scale-2";
              return "color-scale-1";
            }}
          />
        </div>
      </CardSection>

      <div className="grid gap-4 md:grid-cols-2">
        <CardSection tone="white">
          <h3 className="text-lg font-semibold">Projects</h3>
          <p className="mt-1 text-sm text-neutral-600">Manage public portfolio projects.</p>
          <Button asChild className="mt-4 bg-[#252422] text-white hover:bg-[#1f1e1b]">
            <Link href="/profile/projects">Open projects page</Link>
          </Button>
        </CardSection>
        <CardSection tone="brown">
          <h3 className="text-lg font-semibold">Posts</h3>
          <p className="mt-1 text-sm">Publish updates that investors and collaborators can see.</p>
          <Button asChild className="mt-4 bg-[#252422] text-white hover:bg-[#1f1e1b]">
            <Link href="/profile/posts">Open posts page</Link>
          </Button>
        </CardSection>
      </div>
    </div>
  );
}
