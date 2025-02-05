"use client";

import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import ThreeDBackground from "./AniBackground";

export function CreatePostDrawer({onClose}: CreatePostDrawerProps) {
    const [sectors, setSectors] = useState<string[]>([]);
    const [visibility, setVisibility] = useState("public");
    const [caption, setCaption] = useState("");
    const [description, setDescription] = useState("");
    const [includeSocialMedia, setIncludeSocialMedia] = useState(false);
    const [selectedSocialMedia, setSelectedSocialMedia] = useState<string[]>([]);

    const handleSectorSelect = (sector: string) => {
        if (sectors.includes(sector)) {
            setSectors(sectors.filter((s) => s !== sector));
        } else if (sectors.length < 3) {
            setSectors([...sectors, sector]);
        }
    };

    const handlePost = () => {
        // Handle post logic here
        console.log({
            sectors,
            visibility,
            caption,
            description,
            includeSocialMedia,
            selectedSocialMedia,
        });
        onClose();
    };

    return (
        <>

            <Drawer open={true} onOpenChange={onClose} >
                <ThreeDBackground/>
                <DrawerContent className="h-[90vh] items-center ">
                    <DrawerHeader>
                        <div className="flex items-center justify-between w-[50vw]">
                            <Button variant="ghost" size="icon" onClick={onClose} className="bg-transparent text-primary">
                                X
                            </Button>
                            <DrawerTitle>Create Post</DrawerTitle>
                            <Button
                                variant="default"
                                className="bg-secondary text-primary"
                                onClick={handlePost}
                                disabled={!caption || !description || sectors.length === 0}
                            >
                                Post
                            </Button>
                        </div>
                    </DrawerHeader>

                    <div className="flex-col p-4 space-y-6 overflow-y-auto w-[50vw] font-[family-name:var(--font-geist-sans)]">
                        {/* Avatar and Name */}
                        <div className="flex items-center space-x-4">
                            <Avatar>
                                <AvatarImage src="https://github.com/shadcn.png" />
                                <AvatarFallback>CN</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">Your Name</p>
                            </div>
                        </div>

                        {/* Sector Dropdown */}
                        <div className="space-y-2">
                            <p className="text-md font-medium">Choose Sectors (Max 3)</p>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full border-none shadow-lg">
                                        Select Sectors
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {["Tech", "Biotech", "STEM", "Economic"].map((sector) => (
                                        <DropdownMenuItem
                                            key={sector}
                                            onSelect={() => handleSectorSelect(sector)}
                                            disabled={sectors.length >= 3 && !sectors.includes(sector)}
                                           
                                        >
                                            {sector}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <div className="flex flex-wrap gap-2">
                                {sectors.map((sector) => (
                                    <span key={sector} className="px-2 py-1 bg-primary text-white shadow-lg rounded">
                                        {sector}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Visibility Dropdown */}
                        <div className="space-y-2">
                            <p className="text-md font-medium">Visibility</p>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full border-none shadow-lg">
                                        {visibility === "public" ? "Public" : "Friends Only"}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onSelect={() => setVisibility("public")}>
                                        Public
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => setVisibility("friends")}>
                                        Friends Only
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Caption */}
                        <Textarea
                            placeholder="Caption"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            className="font-bold border-none resize-none shadow-lg"
                            rows={1}
                        />

                        {/* Description */}
                        <Textarea
                            placeholder="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="border-none resize-none shadow-lg"
                            rows={4}
                        />

                        {/* Social Media Checkbox */}
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="include-social-media"
                                    checked={includeSocialMedia}
                                    onCheckedChange={(checked) =>
                                        setIncludeSocialMedia(checked as boolean)
                                    }
                                />
                                <label htmlFor="include-social-media" className="text-md font-medium">
                                    Include Social Media
                                </label>
                            </div>
                            {includeSocialMedia && (
                                <div className="flex flex-wrap gap-2">
                                    {["Twitter", "LinkedIn", "Instagram"].map((platform) => (
                                        <Button
                                            className="bg-transparent focus:bg-primary focus:text-white shadow-lg"
                                            key={platform}
                                            variant={
                                                selectedSocialMedia.includes(platform) ? "default": "secondary"
                                            }
                                            onClick={() =>
                                                setSelectedSocialMedia((prev) =>
                                                    prev.includes(platform)
                                                        ? prev.filter((p) => p !== platform)
                                                        : [...prev, platform]
                                                )
                                            }
                                        >
                                            {platform}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Media Upload */}
                        <div className="space-y-2">
                            <p className="text-md font-medium">Add Media</p>
                            <Input type="file" accept="image/*,video/*" className="border-none shadow-lg"/>
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>
        </>
    );
}