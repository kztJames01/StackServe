import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CalendarHeatMap from 'react-calendar-heatmap'; // Custom component for contribution graph

export default function ProfilePage() {
    const projects = [
        { id: 1, title: "Project 1", description: "A cool project", image: "/home.jpg" },
        { id: 2, title: "Project 2", description: "Another cool project", image: "/home.jpg" },
    ];

    const posts = [
        { id: 1, content: "Just launched my new project!", likes: 10, comments: 5 },
        { id: 2, content: "Working on something exciting...", likes: 15, comments: 8 },
    ];

    return (
        <div className="flex p-8 gap-8">
            {/* Left Side */}
            <div className="w-1/4 space-y-6">
                <Avatar className="h-32 w-32">
                    <AvatarImage src="/avatar.jpg" />
                    <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <div>
                    <h2 className="text-2xl font-bold">John Doe</h2>
                    <p className="text-gray-500">Computer Science, Stanford University</p>
                </div>
                <div className="space-y-2">
                    <Button variant="outline" className="w-full">GitHub</Button>
                    <Button variant="outline" className="w-full">LinkedIn</Button>
                    <Button variant="outline" className="w-full">Twitter</Button>
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                        <span className="bg-gray-100 px-2 py-1 rounded">React</span>
                        <span className="bg-gray-100 px-2 py-1 rounded">Python</span>
                        <span className="bg-gray-100 px-2 py-1 rounded">Design</span>
                    </div>
                </div>
            </div>

            {/* Right Side */}
            <div className="w-3/4 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Contributions</CardTitle>
                        <CardDescription>Your activity in the community</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CalendarHeatMap values={[]} />
                    </CardContent>
                </Card>

                <Tabs defaultValue="projects">
                    <TabsList>
                        <TabsTrigger value="projects">Projects</TabsTrigger>
                        <TabsTrigger value="posts">Posts</TabsTrigger>
                    </TabsList>
                    <TabsContent value="projects">
                        <Carousel>
                            <CarouselContent>
                                {projects.map((project) => (
                                    <CarouselItem key={project.id}>
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>{project.title}</CardTitle>
                                                <CardDescription>{project.description}</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <img src={project.image} alt={project.title} className="w-full h-48 object-cover rounded" />
                                            </CardContent>
                                        </Card>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                        </Carousel>
                    </TabsContent>
                    <TabsContent value="posts">
                        <div className="space-y-4">
                            {posts.map((post) => (
                                <Card key={post.id}>
                                    <CardHeader>
                                        <CardTitle>Post</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p>{post.content}</p>
                                        <div className="flex gap-4 mt-4">
                                            <span>Likes: {post.likes}</span>
                                            <span>Comments: {post.comments}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}