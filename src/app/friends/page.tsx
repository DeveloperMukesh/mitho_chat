
"use client";

import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, doc, getDoc, writeBatch, arrayRemove, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { FriendsList } from "@/components/friends-list";
import { toast } from "@/hooks/use-toast";


export default function FriendsPage() {
  const { user, loading, userProfile, refreshUserProfile } = useAuth();
  const router = useRouter();
  const [friends, setFriends] = React.useState<User[]>([]);

  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);
  
  React.useEffect(() => {
      if (!userProfile?.friends || userProfile.friends.length === 0) {
        setFriends([]);
        return;
      };

      const friendPromises = userProfile.friends.map(friendId => getDoc(doc(db, 'users', friendId)));
      
      Promise.all(friendPromises).then(friendDocs => {
          const friendData = friendDocs.map(doc => ({id: doc.id, ...doc.data()}) as User);
          setFriends(friendData);
      })

  }, [userProfile?.friends]);


  const handleUnfriend = async (friendId: string) => {
      if (!user) return;
      try {
          const currentUserRef = doc(db, 'users', user.uid);
          const friendUserRef = doc(db, 'users', friendId);

          const batch = writeBatch(db);
          batch.update(currentUserRef, { friends: arrayRemove(friendId) });
          batch.update(friendUserRef, { friends: arrayRemove(user.uid) });

          await batch.commit();
          await refreshUserProfile();
          
          const sortedMembers = [user.uid, friendId].sort();
          const chatId = sortedMembers.join('_');
          const chatRef = doc(db, "chats", chatId);
          const chatDoc = await getDoc(chatRef);
          if (chatDoc.exists()) {
              await deleteDoc(chatRef); 
          }

          toast({
              title: "Friend removed",
              description: `You are no longer friends.`,
          });
      } catch (error) {
          console.error("Error unfriending:", error);
          toast({
              title: "Error",
              description: "Could not unfriend. Please try again.",
              variant: "destructive",
          });
      }
  };


  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-4xl relative">
        <Card>
            <div className="p-4 border-b flex items-center gap-4">
                <Link href="/" passHref>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-xl font-bold font-headline">Friends</h1>
                    <p className="text-sm text-muted-foreground">Manage your connections</p>
                </div>
            </div>
            <FriendsList friends={friends} handleUnfriend={handleUnfriend} />
        </Card>
      </div>
    </div>
  );
}

