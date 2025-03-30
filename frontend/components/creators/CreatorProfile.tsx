'use client'

import { useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ShareIcon, SaveIcon, MessageIcon } from "@/components/Icon"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

// Mock data for creators (same as in FindCreators page)
const MOCK_CREATORS = [
  {
    id: "1",
    name: "Alex Johnson",
    username: "alexj",
    avatar: "/avatars/alex.jpg",
    project: "AI-Powered Smart Home System",
    skills: ["Machine Learning", "IoT", "React"],
    bio: "Building the future of connected homes with AI integration",
    location: "San Francisco, CA",
    website: "alexjohnson.dev",
    github: "alexj",
    projects: [
      { id: "p1", name: "Smart Home Hub", description: "Central control system for IoT devices with ML-based automation" },
      { id: "p2", name: "Energy Optimizer", description: "Algorithm to reduce energy consumption in smart homes" }
    ],
    contributions: [
      { id: "c1", project: "TensorFlow", description: "Improved documentation for IoT integration" },
      { id: "c2", project: "React Native", description: "Fixed bugs in the Bluetooth module" }
    ]
  },
  {
    id: "2",
    name: "Samantha Lee",
    username: "samlee",
    avatar: "/avatars/samantha.jpg",
    project: "Sustainable Fashion Marketplace",
    skills: ["UI/UX", "Node.js", "Sustainability"],
    bio: "Passionate about combining technology with sustainable fashion",
    location: "New York, NY",
    website: "samanthalee.design",
    github: "samlee",
    projects: [
      { id: "p1", name: "EcoFashion", description: "Marketplace connecting sustainable fashion brands with conscious consumers" },
      { id: "p2", name: "Material Tracker", description: "Tool for tracking the environmental impact of different fabrics" }
    ],
    contributions: [
      { id: "c1", project: "React", description: "Created reusable component library for e-commerce" },
      { id: "c2", project: "MongoDB", description: "Improved documentation for geospatial queries" }
    ]
  },
  // ... other creators from the previous component
]

export default function CreatorProfilePage() {
  const params = useParams()
  const creatorId = params.id
  
  // Find the creator based on the ID from the URL
  const creator = MOCK_CREATORS.find(c => c.id === creatorId) || MOCK_CREATORS[0]
  
  const [newComment, setNewComment] = useState("")
  const [comments, setComments] = useState([
    { id: "1", user: "Maria Silva", text: "Love your work on the Smart Home Hub!", timestamp: "2 days ago" },
    { id: "2", user: "David Kim", text: "Would love to collaborate on your Energy Optimizer project.", timestamp: "1 week ago" }
  ])
  
  const [message, setMessage] = useState("")
  
  const handleAddComment = () => {
    if (newComment.trim() === "") return
    
    const comment = {
      id: Date.now().toString(),
      user: "You",
      text: newComment,
      timestamp: "Just now"
    }
    
    setComments([comment, ...comments])
    setNewComment("")
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left sidebar - Profile info */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="text-center">
              <Avatar className="h-24 w-24 mx-auto">
                <AvatarImage src={creator.avatar} alt={creator.name} />
                <AvatarFallback>{creator.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <CardTitle className="mt-4">{creator.name}</CardTitle>
              <CardDescription>@{creator.username}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center">{creator.bio}</p>
              
              <div className="flex justify-center space-x-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline">
                      <MessageIcon className="mr-2 h-4 w-4" />
                      Message
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Message {creator.name}</SheetTitle>
                      <SheetDescription>
                        Start a conversation about collaboration opportunities.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="py-4">
                      <Textarea 
                        placeholder="Write your message here..." 
                        className="min-h-[200px]"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                      <Button className="mt-4 w-full">Send Message</Button>
                    </div>
                  </SheetContent>
                </Sheet>
                
                <Button variant="outline">
                  <SaveIcon className="mr-2 h-4 w-4" />
                  Save
                </Button>
                
                <Button variant="outline">
                  <ShareIcon className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-gray-500 mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {creator.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="font-medium text-sm text-gray-500 w-24">Location:</span>
                  <span>{creator.location}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium text-sm text-gray-500 w-24">Website:</span>
                  <a href={`https://${creator.website}`} className="text-blue-600 hover:underline">{creator.website}</a>
                </div>
                <div className="flex items-center">
                  <span className="font-medium text-sm text-gray-500 w-24">GitHub:</span>
                  <a href={`https://github.com/${creator.github}`} className="text-blue-600 hover:underline">@{creator.github}</a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main content area */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="projects">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="contributions">Contributions</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>
            
            <TabsContent value="projects" className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">Projects</h2>
              {creator.projects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{project.description}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="contributions" className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">Open Source Contributions</h2>
              {creator.contributions.map((contribution) => (
                <Card key={contribution.id}>
                  <CardHeader>
                    <CardTitle>{contribution.project}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{contribution.description}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="comments" className="space-y-4 mt-6">
              <h2 className="text-2xl font-semibold">Comments</h2>
              
              <Card>
                <CardContent className="pt-6">
                  <Textarea 
                    placeholder="Leave a comment..." 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="mb-4"
                  />
                  <Button onClick={handleAddComment}>Post Comment</Button>
                </CardContent>
              </Card>
              
              {comments.map((comment) => (
                <Card key={comment.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base">{comment.user}</CardTitle>
                      <CardDescription>{comment.timestamp}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p>{comment.text}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

