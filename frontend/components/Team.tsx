'use client'

import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { CardSection } from './layout/dashboard-shell';
import { Textarea } from './ui/textarea';

export default function TeamProfile() {
  return (
    <div className="space-y-6">
      <CardSection tone="white">
        <h2 className="text-lg font-semibold">Team Members</h2>
        <div className="mt-4 flex gap-4">
          <Member initials="JD" />
          <Member initials="AB" />
        </div>
      </CardSection>

      <CardSection tone="brown">
        <h2 className="text-lg font-semibold">AI-Powered Playground</h2>
        <p className="mt-1 text-sm">Capture idea prompts and request suggestions.</p>
        <Textarea placeholder="Write down your ideas..." className="mt-4 min-h-[180px] bg-card" />
        <Button className="mt-4 bg-secondary text-secondary-foreground hover:bg-secondary/90">Get AI Suggestions</Button>
      </CardSection>

      <CardSection tone="white">
        <h2 className="text-lg font-semibold">Team Notes</h2>
        <Textarea placeholder="Write sprint notes and decisions here..." className="mt-4 min-h-[240px]" />
      </CardSection>
    </div>
  );
}

function Member({ initials }: { initials: string }) {
  return (
    <Avatar>
      <AvatarImage src="/home.jpg" />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
