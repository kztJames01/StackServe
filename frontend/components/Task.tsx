'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/app-sidebar";
import { useState } from "react";
import { SaveIcon, CopyIcon } from "@/components/Icon";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";import { DndContext } from "@dnd-kit/core";
import { SidebarInset, SidebarProvider } from "./ui/sidebar";

// Notion-style Task Block
const TaskBlock = ({ id, content, type = 'text' }: { id: string; content: string; type?: string }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const [value, setValue] = useState(content);
    const [isHovered, setIsHovered] = useState(false);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        // Add toast notification here
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group relative flex gap-2 items-start p-2 hover:bg-gray-50 rounded-lg transition-colors"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <button
                {...attributes}
                {...listeners}
                className="handle opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 p-1 -ml-1"
            >
                ⁞⁞
            </button>

            <div className="flex-1">
                {type === 'heading' ? (
                    <h2 className="text-2xl font-bold mb-4">{value}</h2>
                ) : type === 'code' ? (
                    <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg">
                        <code>{value}</code>
                    </pre>
                ) : (
                    <Textarea
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="border-none shadow-none resize-none hover:bg-gray-50 focus:bg-white"
                        placeholder="Type something..."
                    />
                )}
            </div>

            {isHovered && (
                <button
                    onClick={handleCopy}
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary"
                >
                    <CopyIcon className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

// Task Component with Notion-like UI
export function Task() {
    const [blocks, setBlocks] = useState([
        { id: '1', content: 'Project Roadmap', type: 'heading' },
        { id: '2', content: 'Brainstorming session notes...' },
        { id: '3', content: 'const example = "Code block";', type: 'code' },
    ]);

    return (
        <div className="bg-transparent p-8 space-y-4">
            <DndContext>
                {blocks.map((block, index) => (
                    <Card key={block.id} className={`
            ${index % 2 === 0 ? 'bg-white text-primary-foreground' : 'bg-primary text-white'}
            shadow-lg rounded-xl border-0
          `}>
                        <CardContent className="p-4">
                            <TaskBlock
                                id={block.id}
                                content={block.content}
                                type={block.type}
                            />
                        </CardContent>
                    </Card>
                ))}
            </DndContext>

            <Button
                className="mt-4 bg-white text-primary hover:bg-gray-50"
                onClick={() => setBlocks([...blocks, { id: Date.now().toString(), content: '' }])}
            >
                + Add Block
            </Button>
        </div>
    );
}

