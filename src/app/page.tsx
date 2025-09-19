
"use client";

import * as React from "react";
import {
  Users,
  MessageSquare,
  LogOut,
  Settings,
  MoreVertical,
  Trash2,
  Menu,
  Search,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { useAuth } from "@/hooks/use-auth";
import { collection, onSnapshot, query, where, addDoc, getDocs, serverTimestamp, doc, getDoc, updateDoc, arrayUnion, arrayRemove, writeBatch, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Chat, User as AppUser, FriendRequest, Call, Message } from "@/lib/data";
import { ChatView } from "@/components/chat-view";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
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
import { IncomingCallDialog } from "@/components/incoming-call-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ChatList } from "@/components/chat-list";
import { PeopleTab } from "@/components/people-tab";
import { SettingsTab } from "@/components/settings-tab";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { CallView } from "@/components/call-view";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";


const MithoChatLogo = () => (
  <div className="flex items-center gap-2">
    <svg
      role="img"
      aria-label="Mitho Chat logo"
      className="h-8 w-8 text-primary"
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <path d="M164.7,40.15a112.1,112.1,0,0,0-144.57,36.1,12,12,0,0,0,16.5,17.4A88.11,88.11,0,0,1,128,64a87.48,87.48,0,0,1,34.8-7.5,12,12,0,0,0,1.9-23.85Z" />
      <path d="M224,128a96,96,0,0,1-91.4,95.89,12,12,0,0,0,2.83-23.86A72,72,0,0,0,136,68.9a12,12,0,1,0-23.84-2.8A96.11,96.11,0,0,1,32,128,95.42,95.42,0,0,1,55.88,51.84a12,12,0,1,0-17.4-16.5A120,120,0,0,0,128,248a120.13,120.13,0,0,0,120-112,12,12,0,0,0-24,0Z" />
    </svg>
    <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground">
      Mitho Chat
    </h1>
  </div>
);


export default function Home() {
  const [selectedChat, setSelectedChat] = React.useState<Chat | null>(null);
  const { user, loading, logout, userProfile, refreshUserProfile } = useAuth();
  const router = useRouter();
  const [allUsers, setAllUsers] = React.useState<AppUser[]>([]);
  const [chats, setChats] = React.useState<Chat[]>([]);
  const [isCreatingChat, setIsCreatingChat] = React.useState(false);
  const [friendRequests, setFriendRequests] = React.useState<FriendRequest[]>([]);
  const [requestStatus, setRequestStatus] = React.useState<Record<string, 'pending' | 'friends'>>({});
  const [incomingCall, setIncomingCall] = React.useState<Call | null>(null);
  const [activeCall, setActiveCall] = React.useState<Call | null>(null);
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = React.useState<'chats' | 'peoples' | 'settings'>('chats');
  const [chatSearchTerm, setChatSearchTerm] = React.useState("");
  const [desktopChatSearchTerm, setDesktopChatSearchTerm] = React.useState("");
  const [desktopTab, setDesktopTab] = React.useState<'chats' | 'peoples'>('chats');

  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);
  
  // Fetch all users for discovery/search
  React.useEffect(() => {
      if (!user) return;
      const usersCollection = collection(db, 'users');
      const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
          const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
          setAllUsers(usersList);
      });
      return () => unsubscribe();
  }, [user]);

  // Fetch friend requests and update request status
  React.useEffect(() => {
    if (!user || !userProfile) return;

    let currentRequestStatus: Record<string, 'pending' | 'friends'> = {};
    if (userProfile.friends) {
        userProfile.friends.forEach(friendId => {
            currentRequestStatus[friendId] = 'friends';
        });
    }

    const requestsRef = collection(db, "friendRequests");
    
    // Sent requests
    const sentQuery = query(requestsRef, where('from', '==', user.uid), where('status', '==', 'pending'));
    const unsubSent = onSnapshot(sentQuery, (snapshot) => {
        const sentStatuses: Record<string, 'pending' | 'friends'> = {};
        snapshot.docs.forEach(doc => {
            sentStatuses[doc.data().to] = 'pending';
        });
        setRequestStatus(prev => ({...prev, ...sentStatuses}));
    });

    // Received requests
    const receivedQuery = query(requestsRef, where('to', '==', user.uid), where('status', '==', 'pending'));
     const unsubReceived = onSnapshot(receivedQuery, async (snapshot) => {
        const receivedReqs = await Promise.all(snapshot.docs.map(async (docSnap) => {
            const request = { id: docSnap.id, ...docSnap.data() } as FriendRequest;
            const fromUserDoc = await getDoc(doc(db, 'users', request.from));
            if(fromUserDoc.exists()) {
                request.fromUser = fromUserDoc.data() as AppUser;
            }
            return request;
        }));
        setFriendRequests(receivedReqs.filter(req => req.fromUser));
    });
    
    setRequestStatus(prev => ({...prev, ...currentRequestStatus}));

    return () => {
        unsubSent();
        unsubReceived();
    }
  }, [user, userProfile]);

  // Listen for chats
  React.useEffect(() => {
    if (!user) return;

    const chatsCollection = collection(db, 'chats');
    const q = query(chatsCollection, where('members', 'array-contains', user.uid));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatListPromises = snapshot.docs.map(async (chatDoc) => {
        const chatData = { id: chatDoc.id, ...chatDoc.data() } as Chat;

        if (chatData.type === 'direct') {
          const otherUserId = chatData.members.find(m => m !== user.uid);
          if (otherUserId) {
              try {
                const userDoc = await getDoc(doc(db, "users", otherUserId));
                if (userDoc.exists()) {
                  const otherUserData = userDoc.data() as AppUser;
                  chatData.name = otherUserData.displayName;
                  chatData.avatar = otherUserData.photoURL;
                }
              } catch(e) {
                console.error("Error fetching other user's data", e);
                chatData.name = "Unknown User";
                chatData.avatar = "";
              }
          }
        }
        return chatData;
      });

      const chatsFromDb = await Promise.all(chatListPromises);
      const chatMap = new Map<string, Chat>();
      
      chatsFromDb.forEach(chat => {
          chatMap.set(chat.id, chat);
      });
      
      const sortedChats = Array.from(chatMap.values()).sort((a,b) => (b.lastMessageTimestamp?.toMillis() || 0) - (a.lastMessageTimestamp?.toMillis() || 0) );
      
      setChats(sortedChats);
      
      if (selectedChat) {
          const updatedSelectedChat = sortedChats.find(c => c.id === selectedChat.id);
          if (updatedSelectedChat) {
             setSelectedChat(updatedSelectedChat);
          } else {
              setSelectedChat(null);
          }
      }
    });

    return () => unsubscribe();
  }, [user, selectedChat?.id]);

  // Listener for incoming calls
  React.useEffect(() => {
    if (!user) return;
    
    const callsQuery = query(collection(db, 'calls'), where('calleeId', '==', user.uid), where('status', '==', 'ringing'));
    const unsubscribeCalls = onSnapshot(callsQuery, async (snapshot) => {
      const callDocs = snapshot.docChanges();
      if(callDocs.length > 0 && callDocs[0].type === 'added') {
          const callDoc = callDocs[0].doc;
          const callData = { id: callDoc.id, ...callDoc.data() } as Call;
          
          const callerDoc = await getDoc(doc(db, 'users', callData.callerId));
          if (callerDoc.exists()) {
              callData.callerUser = callerDoc.data() as AppUser;
              if (incomingCall?.id !== callData.id) {
                setIncomingCall(callData);
              }
          }
      }
    });

    return () => {
      unsubscribeCalls();
    };
  }, [user, incomingCall?.id]);

  // Listener for ongoing call state
  React.useEffect(() => {
    if (!activeCall?.id) return;

    const unsub = onSnapshot(doc(db, 'calls', activeCall.id), (docSnap) => {
        if (!docSnap.exists() || !['ringing', 'connected'].includes(docSnap.data()?.status)) {
            setActiveCall(null);
        } else {
            setActiveCall(prev => prev ? ({ ...prev, ...docSnap.data() }) : null);
        }
    });

    return () => unsub();
  }, [activeCall?.id]);


  const handleCreateChat = async (otherUser: AppUser, options?: { setActive: boolean }) => {
    const { setActive = true } = options || {};
    if (!user) return;
    setIsCreatingChat(true);
    
    const sortedMembers = [user.uid, otherUser.id].sort();
    const chatId = sortedMembers.join('_');
    const chatRef = doc(db, "chats", chatId);
    const chatDoc = await getDoc(chatRef);
    
    let chatToSelect: Chat;

    if(chatDoc.exists()) {
        const existingChatDoc = chatDoc;
        chatToSelect = { id: existingChatDoc.id, ...existingChatDoc.data() } as Chat;
    } else {
        await setDoc(chatRef, {
            id: chatId,
            type: "direct",
            members: sortedMembers,
            createdAt: serverTimestamp(),
            lastMessage: "Chat created",
            lastMessageTimestamp: serverTimestamp(),
            lastMessageSenderId: user.uid,
            unreadCount: 0,
        });

        const newChatDoc = await getDoc(chatRef);
        chatToSelect = {id: newChatDoc.id, ...newChatDoc.data()} as Chat;
    }

    if (setActive) {
        chatToSelect.name = otherUser.displayName;
        chatToSelect.avatar = otherUser.photoURL;
        setSelectedChat(chatToSelect);
        setActiveTab('chats');
        setDesktopTab('chats');
    }
    setIsCreatingChat(false);
  };

  const handleSendFriendRequest = async (toId: string) => {
    if (!user) return;
    setRequestStatus(prev => ({...prev, [toId]: 'pending'}));
    try {
        const reqRef = collection(db, 'friendRequests');
        const q = query(reqRef, where('from', '==', user.uid), where('to', '==', toId));
        const existingReq = await getDocs(q);

        if (existingReq.empty) {
            await addDoc(collection(db, 'friendRequests'), {
                from: user.uid,
                to: toId,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            toast({ title: "Friend request sent!" });
        } else {
            toast({ title: "Request already sent.", variant: "default" });
        }
    } catch(e) {
        console.error("Error sending friend request:", e);
        toast({ title: "Error sending request", variant: 'destructive'});
        setRequestStatus(prev => {
            const newState = {...prev};
            delete newState[toId];
            return newState;
        });
    }
  };

  const handleCancelFriendRequest = async (toId: string) => {
    if (!user) return;
    try {
        const reqRef = collection(db, 'friendRequests');
        const q = query(reqRef, where('from', '==', user.uid), where('to', '==', toId), where('status', '==', 'pending'));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const docToDelete = querySnapshot.docs[0];
            await deleteDoc(docToDelete.ref);
            setRequestStatus(prev => {
                const newState = {...prev};
                delete newState[toId];
                return newState;
            });
            toast({ title: "Friend request canceled" });
        }
    } catch (e) {
        console.error("Error canceling friend request:", e);
        toast({ title: "Error canceling request", variant: 'destructive'});
    }
  };

  const handleFriendRequest = async (request: FriendRequest, action: 'accept' | 'decline') => {
      const requestRef = doc(db, 'friendRequests', request.id);
      
      if (action === 'accept') {
          const batch = writeBatch(db);
          batch.update(requestRef, { status: 'accepted' });
          
          const currentUserRef = doc(db, 'users', request.to);
          const fromUserRef = doc(db, 'users', request.from);
          
          batch.update(currentUserRef, { friends: arrayUnion(request.from) });
          batch.update(fromUserRef, { friends: arrayUnion(request.to) });

          await batch.commit();
          await refreshUserProfile();
          toast({ title: "Friend request accepted!"});

          if(request.fromUser) {
            handleCreateChat(request.fromUser, { setActive: isMobile });
          }

      } else { // decline
          await deleteDoc(requestRef);
          toast({ title: "Friend request declined." });
      }
  }

  const handleUnfriend = async (friendId: string) => {
      if (!user) return;
      try {
          const currentUserRef = doc(db, 'users', user.uid);
          const friendUserRef = doc(db, 'users', friendId);

          const batch = writeBatch(db);
          batch.update(currentUserRef, { friends: arrayRemove(friendId) });
          batch.update(friendUserRef, { friends: arrayRemove(user.uid) });

          await batch.commit();
          refreshUserProfile();
          
          // Also remove chat if it exists
          const sortedMembers = [user.uid, friendId].sort();
          const chatId = sortedMembers.join('_');
          const chatRef = doc(db, "chats", chatId);
          const chatDoc = await getDoc(chatRef);
          if (chatDoc.exists()) {
              await deleteDoc(chatRef); 
          }
          if (selectedChat?.id === chatId) {
              setSelectedChat(null);
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

  const createCallMessage = async (call: Call, status: 'missed' | 'ended', duration?: number) => {
    const messagesCol = collection(db, "chats", call.chatId, "messages");
      await addDoc(messagesCol, {
          senderId: call.callerId,
          timestamp: serverTimestamp(),
          type: 'call',
          callInfo: {
              type: call.type,
              status: status,
              duration: duration || 0,
          }
      });
      const lastMessageText = status === 'missed' ? 'Missed call' : 'Call ended';
       const chatRef = doc(db, "chats", call.chatId);
      await updateDoc(chatRef, {
          lastMessage: lastMessageText,
          lastMessageTimestamp: serverTimestamp(),
          lastMessageSenderId: call.callerId,
      });
  }

  const handleCallAction = async (call: Call, action: 'accept' | 'decline') => {
      const callRef = doc(db, 'calls', call.id);
      if (action === 'accept') {
          await updateDoc(callRef, { status: 'connected' });
          setActiveCall(call);
          
          const chatDoc = await getDoc(doc(db, 'chats', call.chatId));
          if(chatDoc.exists()) {
               const chatData = { id: chatDoc.id, ...chatDoc.data() } as Chat;
               const otherUserId = chatData.members.find(m => m !== user?.uid);
               if (otherUserId) {
                  const userDoc = await getDoc(doc(db, "users", otherUserId));
                  if (userDoc.exists()) {
                      const otherUserData = userDoc.data() as AppUser;
                      chatData.name = otherUserData.displayName;
                      chatData.avatar = otherUserData.photoURL;
                  }
               }
               setSelectedChat(chatData);
          }
      } else { 
          await updateDoc(callRef, { status: 'declined' });
          await createCallMessage(call, 'missed');
      }
      setIncomingCall(null);
  };
  
  const handleInitiateCall = async (chat: Chat, type: 'audio' | 'video') => {
    if (!user) return;
    const calleeId = chat.members.find(m => m !== user.uid);
    if (!calleeId) return;

    try {
        const callsCollection = collection(db, 'calls');
        const newCallRef = doc(callsCollection);
        
        const newCallData: Partial<Call> = {
            id: newCallRef.id,
            chatId: chat.id,
            callerId: user.uid,
            calleeId: calleeId,
            members: [user.uid, calleeId],
            type: type,
            status: 'ringing',
            createdAt: serverTimestamp(),
        };

        await setDoc(newCallRef, newCallData);
        
        const callDoc = await getDoc(newCallRef);
        const newCall = { id: callDoc.id, ...callDoc.data() } as Call;
        newCall.callerUser = userProfile as AppUser;

        setActiveCall(newCall);

    } catch (error) {
        console.error("Error initiating call:", error);
        toast({ title: "Error", description: "Could not start call.", variant: "destructive"});
    }
  }

  const handleEndCall = async (duration: number) => {
    if (!user || !activeCall) return;
    
    const callRef = doc(db, 'calls', activeCall.id);
    const callDoc = await getDoc(callRef);
      
    if (callDoc.exists() && callDoc.data().status !== 'ended') {
        const isMissed = callDoc.data()?.status === 'ringing';
        const isCaller = callDoc.data()?.callerId === user.uid;
        
        // Only caller creates the message to avoid duplicates
        if (isCaller) {
             if (isMissed) {
                 await createCallMessage(activeCall, 'missed');
            } else if (duration > 0) {
                 await createCallMessage(activeCall, 'ended', duration);
            }
        }
        
        await updateDoc(callRef, { status: 'ended', endedAt: serverTimestamp() });
    }
    setActiveCall(null);
  }


  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <MithoChatLogo />
            <Skeleton className="h-4 w-32 mt-2" />
        </div>
      </div>
    );
  }

  if (activeCall && selectedChat) {
      return (
          <CallView
              contact={selectedChat}
              initialCallState={activeCall}
              onEndCall={(duration) => handleEndCall(duration)}
          />
      )
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  }

  const friends = allUsers.filter(u => userProfile?.friends?.includes(u.id));
  
  const DesktopSidebar = ({
      activeTab,
      onTabChange,
  }: {
      activeTab: 'chats' | 'peoples';
      onTabChange: (tab: 'chats' | 'peoples') => void;
  }) => {
    const filteredDesktopChats = chats.filter(chat => 
      chat.name.toLowerCase().includes(desktopChatSearchTerm.toLowerCase())
    );

    return (
    <>
      <SidebarHeader>
        <div className="flex items-center justify-between p-2">
          <MithoChatLogo />
          <div className="flex items-center gap-1">
            <Button variant={activeTab === 'chats' ? 'secondary': 'ghost'} size="icon" onClick={() => onTabChange('chats')}>
                <MessageSquare />
            </Button>
            <Button variant={activeTab === 'peoples' ? 'secondary': 'ghost'} size="icon" onClick={() => onTabChange('peoples')}>
                <Users />
            </Button>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-0 flex flex-col">
          {activeTab === 'chats' && (
             <div className="p-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search chats..."
                        className="pl-9"
                        value={desktopChatSearchTerm}
                        onChange={(e) => setDesktopChatSearchTerm(e.target.value)}
                    />
                </div>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chats' ? (
              <ChatList 
                chats={filteredDesktopChats}
                selectedChat={selectedChat}
                onSelectChat={(chat) => {
                    setSelectedChat(chat);
                    if (isMobile) {
                      setActiveTab('chats');
                    } else {
                      setDesktopTab('chats');
                    }
                }}
              />
            ) : (
              <PeopleTab 
                  user={user}
                  userProfile={userProfile}
                  allUsers={allUsers}
                  requestStatus={requestStatus}
                  handleSendFriendRequest={handleSendFriendRequest}
                  handleCancelFriendRequest={handleCancelFriendRequest}
                  friendRequests={friendRequests}
                  handleFriendRequest={handleFriendRequest}
                  onCreateChat={(u) => handleCreateChat(u, { setActive: !isMobile })}
                  isCreatingChat={isCreatingChat}
                />
            )}
          </div>
      </SidebarContent>
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start h-14">
              <div className="flex justify-between items-center w-full">
                <div className="flex gap-3 items-center text-left">
                  <Avatar className="h-10 w-10" key={userProfile?.photoURL}>
                    <AvatarImage src={userProfile?.photoURL || ''} alt={userProfile?.handle || ''} />
                    <AvatarFallback>{getInitials(userProfile?.displayName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{userProfile?.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      @{userProfile?.handle}
                    </p>
                  </div>
                </div>
                <MoreVertical className="h-5 w-5 text-muted-foreground" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mb-2">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/settings" passHref>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
            </Link>
             <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex justify-between items-center">
                    <div className="flex items-center">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Friends</span>
                    </div>
                    <Badge variant="secondary">{friends.length}</Badge>
                </DropdownMenuLabel>
                <div className="p-1 space-y-1 max-h-48 overflow-y-auto">
                {friends.length > 0 ? (
                    friends.slice(0,5).map((friend) => (
                    <DropdownMenuItem key={friend.id} className="flex items-center justify-between p-2" onSelect={(e) => e.preventDefault()}>
                        <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                            <AvatarImage src={friend.photoURL} alt={friend.handle} />
                            <AvatarFallback>{getInitials(friend.displayName)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{friend.displayName}</span>
                        </div>
                    </DropdownMenuItem>
                    ))
                ) : (
                    <p className="text-xs text-muted-foreground text-center p-2">No friends yet.</p>
                )}
                </div>
                {friends.length > 0 && 
                    <>
                        <DropdownMenuSeparator />
                        <Link href="/friends" passHref>
                            <DropdownMenuItem>
                                View All Friends
                            </DropdownMenuItem>
                        </Link>
                    </>
                }
              </DropdownMenuGroup>

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </>
    )
  }

  const filteredChats = chats.filter(chat => 
      chat.name.toLowerCase().includes(chatSearchTerm.toLowerCase())
  );

  const renderMobileContent = () => {
    switch (activeTab) {
      case 'chats':
        return <ChatList chats={filteredChats} selectedChat={selectedChat} onSelectChat={setSelectedChat} />;
      case 'peoples':
        return <PeopleTab 
                  user={user}
                  userProfile={userProfile}
                  allUsers={allUsers}
                  requestStatus={requestStatus}
                  handleSendFriendRequest={handleSendFriendRequest}
                  handleCancelFriendRequest={handleCancelFriendRequest}
                  friendRequests={friendRequests}
                  handleFriendRequest={handleFriendRequest}
                  onCreateChat={(u) => handleCreateChat(u, { setActive: true })}
                  isCreatingChat={isCreatingChat}
                />;
      case 'settings':
        return <SettingsTab 
                  userProfile={userProfile} 
                  logout={logout} 
                  friends={friends} 
                  handleUnfriend={handleUnfriend}
                  refreshUserProfile={refreshUserProfile}
                />;
      default:
        return null;
    }
  }

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full bg-background">
        {isMobile ? (
          <div className="flex flex-col w-full h-full">
            {selectedChat ? (
              <ChatView 
                key={selectedChat.id} 
                chat={selectedChat} 
                onExitChat={() => setSelectedChat(null)}
                onInitiateCall={(type) => handleInitiateCall(selectedChat, type)}
              />
            ) : (
              <>
                <main className="flex-1 overflow-y-auto pb-20">
                  <div className="p-4 space-y-4">
                    <MithoChatLogo />
                    {activeTab === 'chats' && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search chats..."
                                className="pl-9"
                                value={chatSearchTerm}
                                onChange={(e) => setChatSearchTerm(e.target.value)}
                            />
                        </div>
                    )}
                  </div>
                  {renderMobileContent()}
                </main>
                <BottomNavBar activeTab={activeTab} onTabChange={setActiveTab} />
              </>
            )}
          </div>
        ) : (
          <>
            <Sidebar>
              <DesktopSidebar activeTab={desktopTab} onTabChange={setDesktopTab} />
            </Sidebar>

            <main className="flex-1 max-h-screen overflow-hidden">
              { selectedChat ? (
                <ChatView 
                  key={selectedChat.id} 
                  chat={selectedChat} 
                  onExitChat={() => setSelectedChat(null)} 
                  onInitiateCall={(type) => handleInitiateCall(selectedChat, type)}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-card">
                  <div className="text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-lg font-medium">Select a chat</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Start a new conversation or select one from the sidebar.
                    </p>
                  </div>
                </div>
              )}
            </main>
          </>
        )}

        { incomingCall && <IncomingCallDialog call={incomingCall} onAccept={() => handleCallAction(incomingCall, 'accept')} onDecline={() => handleCallAction(incomingCall, 'decline')} /> }
      </div>
    </SidebarProvider>
  );
}



    
