'use client'
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

import { Textarea } from "./ui/textarea";

export default function TeamProfile() {
    const [note, setNote] = useState<string>('');
    const [notes, setNotes] = useState<Note[]>([]);

    const handleSaveNote = () => {
        if (note.trim()) {
            const newNote = {
                id: Date.now(),
                content: note,
                timestamp: new Date().toISOString(),
            };
            setNotes((prevNotes: any) => [newNote, ...prevNotes]);
            setNote('');
        }
    };
    const cards = [
        { title: 'AI-Powered Playground', content: <AIBox/> },
        { title: 'Team Progress', content: <div className="h-4 bg-gray-100 rounded" /> },
        { title: 'Team Members', content: <Members/> },
        { title: 'Take Notes', content: <Textarea placeholder="Write your notes here..." className="min-h-[50vh] focus:outline-none"/> },
        { title: 'Project History', content: <div className="space-y-4" /> },
    ];

    return (

        <div className="bg-white p-8 space-y-6">
            {cards.map((card, index) => (
                <Card key={card.title} className={`
              shadow-lg rounded-xl border-0
              ${index % 2 === 0 ? 'bg-white text-primary-foreground' : 'bg-primary text-background'}
            `}>
                    <CardHeader>
                        <CardTitle>{card.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {card.content}
                    </CardContent>
                </Card>
            ))}

        </div>

    );
}

export function Members(){
    return (
        <div className="flex gap-4">
            <Avatar>
                <AvatarImage src="/home.jpg" />
                <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <Avatar>
                <AvatarImage src="/home.jpg" />
                <AvatarFallback>AB</AvatarFallback>
            </Avatar>
        </div>
    );
}

export function AIBox(){
    return (
        <div>
            <Textarea placeholder="Write down your ideas..." className="min-h-[200px]" />
            <Button className="mt-4 text-background bg-primary">Get AI Suggestions</Button>
        </div>
    );
}

function useState<T>(arg0: never[]): [any, any] {
    throw new Error("Function not implemented.");
}
