
"use client";

import * as React from "react";
import { MoreVertical, Trash2, Search } from "lucide-react";
import { User } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "./ui/input";


export const FriendsList = ({
    friends,
    handleUnfriend,
} : {
    friends: User[],
    handleUnfriend: (friendId: string) => void,
}) => {
    
    const [searchTerm, setSearchTerm] = React.useState("");
    const [userToUnfriend, setUserToUnfriend] = React.useState<User | null>(null);

    const getInitials = (name: string | null | undefined) => {
        if (!name) return "";
        const names = name.split(' ');
        if (names.length > 1) {
            return names[0][0] + names[names.length - 1][0];
        }
        return name.substring(0, 2);
    }
    
    const filteredFriends = friends.filter(friend => 
        friend.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        friend.handle.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-2 space-y-2">
            <div className="p-2">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search friends..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {filteredFriends.length > 0 ? (
                filteredFriends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50">
                    <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={friend.photoURL} alt={friend.handle} />
                        <AvatarFallback>{getInitials(friend.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium">{friend.displayName}</p>
                        <p className="text-sm text-muted-foreground">@{friend.handle}</p>
                    </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                             <DropdownMenuItem onSelect={() => setUserToUnfriend(friend)}>
                                <Trash2 className="mr-2 h-4 w-4 text-destructive"/>
                                <span className="text-destructive">Unfriend</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                ))
            ) : (
                <p className="text-sm text-muted-foreground text-center p-4">
                    {searchTerm ? "No friends found." : "No friends yet. Find some in the 'Peoples' tab."}
                </p>
            )}
            </div>
             <AlertDialog open={!!userToUnfriend} onOpenChange={(open) => !open && setUserToUnfriend(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. You will remove {userToUnfriend?.displayName} from your friends list and delete your chat history.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => userToUnfriend && handleUnfriend(userToUnfriend.id)}>
                    Continue
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
    )
}
