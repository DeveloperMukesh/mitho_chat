
"use client";

import * as React from "react";
import Link from 'next/link';
import {
    ChevronRight,
    LogOut,
    Settings,
    Users,
    Trash2,
    MoreVertical,
    User as UserIcon,
    ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { User } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { FriendsList } from "./friends-list";


export const SettingsTab = ({
    userProfile,
    logout,
    friends,
    handleUnfriend,
    refreshUserProfile,
} : {
    userProfile: User | null,
    logout: () => void,
    friends: User[],
    handleUnfriend: (friendId: string) => void,
    refreshUserProfile: () => void,
}) => {
    
    const router = useRouter();

    const getInitials = (name: string | null | undefined) => {
        if (!name) return "";
        const names = name.split(' ');
        if (names.length > 1) {
            return names[0][0] + names[names.length - 1][0];
        }
        return name.substring(0, 2);
    }
    
    const [isFriendsOpen, setIsFriendsOpen] = React.useState(false);

    // Refresh user profile when tab becomes visible
    React.useEffect(() => {
        refreshUserProfile();
    }, []);

    if (isFriendsOpen) {
        return (
            <div className="p-2 space-y-2">
                 <Button variant="ghost" onClick={() => setIsFriendsOpen(false)} className="mb-2 -ml-2">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Settings
                 </Button>
                 <h2 className="text-xl font-semibold px-2 font-headline">Friends ({friends.length})</h2>
                 <FriendsList friends={friends} handleUnfriend={handleUnfriend} />
            </div>
        )
    }

    return (
        <div className="p-2">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-card mb-4">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={userProfile?.photoURL || ''} alt={userProfile?.handle || ''} />
                    <AvatarFallback className="text-2xl">{getInitials(userProfile?.displayName)}</AvatarFallback>
                </Avatar>
                <div>
                    <h2 className="text-xl font-bold">{userProfile?.displayName}</h2>
                    <p className="text-muted-foreground">@{userProfile?.handle}</p>
                </div>
            </div>
            
            <div className="space-y-1">
                <Button variant="ghost" className="w-full justify-start text-base p-6" onClick={() => router.push('/settings')}>
                   <UserIcon className="mr-4 h-5 w-5" /> Account
                   <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" className="w-full justify-start text-base p-6" onClick={() => setIsFriendsOpen(true)}>
                   <Users className="mr-4 h-5 w-5" /> Friends
                   <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
                </Button>
                 <Button variant="ghost" className="w-full justify-start text-base p-6" onClick={() => router.push('/settings')}>
                   <Settings className="mr-4 h-5 w-5" /> App Settings
                   <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" className="w-full justify-start text-base p-6 text-destructive hover:text-destructive" onClick={logout}>
                   <LogOut className="mr-4 h-5 w-5" /> Log Out
                </Button>
            </div>
        </div>
    )

}
