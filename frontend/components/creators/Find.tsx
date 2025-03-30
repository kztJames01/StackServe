'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Badge } from "@/components/ui/badge"
import { SearchIcon } from "lucide-react"
import Link from "next/link"
// Mock data for creators
const MOCK_CREATORS = [
  {
    id: "1",
    name: "Alex Johnson",
    username: "alexj",
    avatar: "/avatars/alex.jpg",
    project: "AI-Powered Smart Home System",
    skills: ["Machine Learning", "IoT", "React"],
    bio: "Building the future of connected homes with AI integration"
  },
  {
    id: "2",
    name: "Samantha Lee",
    username: "samlee",
    avatar: "/avatars/samantha.jpg",
    project: "Sustainable Fashion Marketplace",
    skills: ["UI/UX", "Node.js", "Sustainability"],
    bio: "Passionate about combining technology with sustainable fashion"
  },
  {
    id: "3",
    name: "Marcus Chen",
    username: "mchen",
    avatar: "/avatars/marcus.jpg",
    project: "Blockchain for Supply Chain",
    skills: ["Blockchain", "Solidity", "Supply Chain"],
    bio: "Working on transparent supply chain solutions using blockchain"
  },
  {
    id: "4",
    name: "Priya Patel",
    username: "priyap",
    avatar: "/avatars/priya.jpg",
    project: "AR Educational Platform",
    skills: ["AR/VR", "Unity", "Education Tech"],
    bio: "Creating immersive learning experiences through augmented reality"
  },
  {
    id: "5",
    name: "Jordan Taylor",
    username: "jtaylor",
    avatar: "/avatars/jordan.jpg",
    project: "Mental Health App",
    skills: ["Flutter", "Psychology", "UX Research"],
    bio: "Developing accessible mental health resources through technology"
  },
  {
    id: "6",
    name: "Emma Wilson",
    username: "ewilson",
    avatar: "/avatars/emma.jpg",
    project: "Renewable Energy Dashboard",
    skills: ["Data Visualization", "Python", "Clean Energy"],
    bio: "Visualizing the impact of renewable energy adoption worldwide"
  }
] as unknown as Creator[];

export default function FindCreatorsPage() {
  const [creators, setCreators] = useState(MOCK_CREATORS)
  const [searchQuery, setSearchQuery] = useState("")
  const [recommendedCreators, setRecommendedCreators] = useState(MOCK_CREATORS)

  // Filter creators based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setCreators(MOCK_CREATORS)
    } else {
      const filtered = MOCK_CREATORS.filter(creator => 
        creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase())) ||
        creator.project.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setCreators(filtered)
    }
  }, [searchQuery])

  // This would be replaced with actual ML recommendations in a real app
  const getRecommendations = () => {
    // Simulate ML recommendations by shuffling the array
    return [...MOCK_CREATORS].sort(() => Math.random() - 0.5)
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col items-center text-center space-y-4 mb-8">
        <h1 className="text-4xl font-bold">Find Creators</h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          Connect with talented creators based on shared interests, skills, and projects. 
          Our machine learning algorithm recommends the best matches for collaboration.
        </p>
      </div>

      <div className="relative max-w-md mx-auto mb-8">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder="Search by name, skills, or project..."
          className="pl-10 py-6"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Recommended for You</h2>
          <Carousel className="w-full">
            <CarouselContent>
              {recommendedCreators.map((creator) => (
                <CarouselItem key={creator.id} className="md:basis-1/2 lg:basis-1/3">
                  <CreatorCard creator={creator} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">All Creators</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creators.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CreatorCard({ creator }: { creator: Creator }) {
  return (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={creator.avatar} alt={creator.name} />
          <AvatarFallback>{creator.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle>{creator.name}</CardTitle>
          <CardDescription>@{creator.username}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium text-sm text-gray-500">Current Project</h3>
          <p className="font-medium">{creator.project}</p>
        </div>
        <div>
          <h3 className="font-medium text-sm text-gray-500 mb-2">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {creator.skills.map((skill) => (
              <Badge key={skill} variant="secondary">{skill}</Badge>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/creator-profile/${creator.id}`} className="w-full">
          <Button variant="outline" className="w-full">View Profile</Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
