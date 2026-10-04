'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { SearchIcon } from "lucide-react"
import Link from "next/link"
import { DashboardShell } from "@/components/layout/dashboard-shell"

type Freelancer = {
  id: string
  name: string
  username: string
  avatar: string
  role: string
  dayRate: number
  union: string
  kit: string[]
  bio: string
}

// mock roster until the recruit kind is reworked
const MOCK_FREELANCERS: Freelancer[] = [
  {
    id: "1",
    name: "Alex Johnson",
    username: "alexj",
    avatar: "/avatars/alex.jpg",
    role: "Photographer",
    dayRate: 850,
    union: "Non-union",
    kit: ["Sony A7RV", "Profoto B10"],
    bio: "Editorial and campaign photographer, 8 years on set"
  },
  {
    id: "2",
    name: "Samantha Lee",
    username: "samlee",
    avatar: "/avatars/samantha.jpg",
    role: "Stylist",
    dayRate: 600,
    union: "IATSE 892",
    kit: ["Full styling kit", "Steamer"],
    bio: "Wardrobe stylist for lookbooks and e-comm"
  },
  {
    id: "3",
    name: "Marcus Chen",
    username: "mchen",
    avatar: "/avatars/marcus.jpg",
    role: "MUA",
    dayRate: 550,
    union: "Non-union",
    kit: ["Kit on request"],
    bio: "Beauty and special effects makeup"
  },
  {
    id: "4",
    name: "Priya Patel",
    username: "priyap",
    avatar: "/avatars/priya.jpg",
    role: "Set Designer",
    dayRate: 700,
    union: "BECTU",
    kit: ["Prop library access"],
    bio: "Set builds for product and fashion shoots"
  },
  {
    id: "5",
    name: "Jordan Taylor",
    username: "jtaylor",
    avatar: "/avatars/jordan.jpg",
    role: "Photographer",
    dayRate: 950,
    union: "Non-union",
    kit: ["Canon R5", "Lighting package"],
    bio: "Commercial product photography"
  },
  {
    id: "6",
    name: "Emma Wilson",
    username: "ewilson",
    avatar: "/avatars/emma.jpg",
    role: "Stylist",
    dayRate: 500,
    union: "Non-union",
    kit: ["Basic styling kit"],
    bio: "Emerging stylist, great with streetwear"
  }
]

export default function RosterPage() {
  const [freelancers, setFreelancers] = useState(MOCK_FREELANCERS)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFreelancers(MOCK_FREELANCERS)
    } else {
      const filtered = MOCK_FREELANCERS.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.kit.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setFreelancers(filtered)
    }
  }, [searchQuery])

  return (
    <DashboardShell title="Freelancer Roster" description="Photographers, stylists, MUAs, and set designers with day rates, union status, and kit lists.">
      <div className="relative max-w-md mb-8">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="text-muted-foreground" />
        </div>
        <Input
          type="text"
          placeholder="Search by name, role, or kit..."
          className="pl-10 py-6"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {freelancers.map((f) => (
          <FreelancerCard key={f.id} freelancer={f} />
        ))}
      </div>
      {freelancers.length === 0 && (
        <p className="text-sm text-muted-foreground">No freelancers match that search.</p>
      )}
    </DashboardShell>
  )
}

function FreelancerCard({ freelancer }: { freelancer: Freelancer }) {
  return (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={freelancer.avatar} alt={freelancer.name} />
          <AvatarFallback>{freelancer.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle>{freelancer.name}</CardTitle>
          <CardDescription>{freelancer.role}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm text-muted-foreground">Day Rate</h3>
          <p className="font-medium">${freelancer.dayRate}/day</p>
        </div>
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm text-muted-foreground">Union</h3>
          <p className="font-medium">{freelancer.union}</p>
        </div>
        <div>
          <h3 className="font-medium text-sm text-muted-foreground mb-2">Kit</h3>
          <div className="flex flex-wrap gap-2">
            {freelancer.kit.map((item) => (
              <Badge key={item} variant="secondary">{item}</Badge>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/creator-profile/${freelancer.id}`} className="w-full">
          <Button variant="outline" className="w-full">View Profile</Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
