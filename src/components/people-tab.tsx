
"use client";

import * as React from "react";
import {
    Search,
    UserPlus,
    UserCheck,
    UserX,
    Loader2,
    Trash2,
    MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, FriendRequest } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const PeopleTab = ({
    user,
    userProfile,
    allUsers,
    requestStatus,
    handleSendFriendRequest,
    handleCancelFriendRequest,
    friendRequests,
    handleFriendRequest,
    onCreateChat,
    isCreatingChat,
}: {
    user: any,
    userProfile: User | null,
    allUsers: User[],
    requestStatus: Record<string, 'pending' | 'friends'>,
    handleSendFriendRequest: (toId: string) => void,
    handleCancelFriendRequest: (toId: string) => void,
    friendRequests: FriendRequest[],
    handleFriendRequest: (request: FriendRequest, action: 'accept' | 'decline') => void,
    onCreateChat: (user: User) => void,
    isCreatingChat: boolean,
}) => {
    const [searchTerm, setSearchTerm] = React.useState("");

    const getInitials = (name: string | null | undefined) => {
        if (!name) return "";
        const names = name.split(' ');
        if (names.length > 1) {
            return names[0][0] + names[names.length - 1][0];
        }
        return name.substring(0, 2);
    }

    const filteredUsers = React.useMemo(() => {
        if (!user) return [];
        const lowercasedTerm = searchTerm.toLowerCase();
        let users = allUsers.filter(u => u.id !== user.uid);

        if (lowercasedTerm) {
             return users.filter(u =>
                u.displayName?.toLowerCase().includes(lowercasedTerm) || 
                u.handle?.toLowerCase().includes(lowercasedTerm)
            );
        }
        
        return users;
    }, [searchTerm, allUsers, user]);


    return (
        <div className="p-2 space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search people by name or @handle"
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {isCreatingChat && (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <p>Starting chat...</p>
                </div>
            )}
            
            {friendRequests.length > 0 && !searchTerm && (
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-muted-foreground px-2 flex items-center">Friend Requests <Badge className="ml-2">{friendRequests.length}</Badge></h2>
                    <Card className="bg-secondary/50">
                        <CardContent className="p-3">
                            <div className="space-y-2">
                                {friendRequests.map((req) => (
                                    req.fromUser &&
                                    <div key={req.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={req.fromUser.photoURL} alt={req.fromUser.handle} data-ai-hint="person face" />
                                                <AvatarFallback>{getInitials(req.fromUser.displayName)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-semibold">{req.fromUser.displayName}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="icon" variant="outline" className="h-7 w-7 bg-green-500/20 hover:bg-green-500/30" onClick={() => handleFriendRequest(req, 'accept')}>
                                                <UserCheck className="h-4 w-4 text-green-700" />
                                            </Button>
                                            <Button size="icon" variant="outline" className="h-7 w-7 bg-red-500/20 hover:bg-red-500/30" onClick={() => handleFriendRequest(req, 'decline')}>
                                                <UserX className="h-4 w-4 text-red-700" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}


            <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground px-2">
                    {searchTerm ? `Search Results (${filteredUsers.length})` : 'All People'}
                </h2>
                {filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => {
                       const status = requestStatus[u.id];

                       return (
                        <Card key={u.id}>
                            <CardContent className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={u.photoURL} alt={u.handle} data-ai-hint="person face" />
                                        <AvatarFallback>{getInitials(u.displayName)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{u.displayName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            @{u.handle}
                                        </p>
                                    </div>
                                </div>
                                {status === 'friends' ? (
                                     <Button
                                        size="sm"
                                        variant="secondary"
                                        className="h-8"
                                        onClick={() => onCreateChat(u)}
                                        disabled={isCreatingChat}
                                    >
                                        <MessageSquare className="mr-2 h-4 w-4" />
                                        Message
                                    </Button>
                                ) : status === 'pending' ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                             <Button size="sm" variant="outline" className="h-8">
                                                <UserCheck className="mr-2 h-4 w-4 text-orange-500" />
                                                Pending
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handleCancelFriendRequest(u.id)} className="text-destructive focus:text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4"/>
                                                Cancel Request
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                ) : (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8"
                                        onClick={() => handleSendFriendRequest(u.id)}
                                    >
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Add Friend
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                       )
                    })
                ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        {searchTerm ? 'No users found.' : 'No other users have joined yet.'}
                    </div>
                )}
            </div>
            
        </div>
    )
}

    
