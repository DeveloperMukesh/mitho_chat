
"use client";
import * as React from "react";
import {
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Mic,
  Smile,
  Send,
  Loader2,
  PhoneMissed,
  PhoneForwarded,
  VideoOff,
  BellOff,
  Eraser,
  CircleSlash,
  Trash2,
  ArrowLeft,
  Bell,
  Info,
  Download,
  FileText,
  X,
} from "lucide-react";
import Image from "next/image";
import { collection, doc, getDoc, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, setDoc, deleteDoc, writeBatch, getDocs, arrayUnion, arrayRemove, where } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Chat, Message, User } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserInfoSheet } from "./user-info-sheet";
import { ImageViewDialog } from "./image-view-dialog";
import { VoiceRecorder } from "./voice-recorder";
import { Progress } from "./ui/progress";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";


const formatCallDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
};

const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
);

const VoiceMessagePlayer = ({ audioUrl }: { audioUrl: string }) => {
    const audioRef = React.useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [duration, setDuration] = React.useState("0:00");

    const handlePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };
    
    React.useEffect(() => {
        const audio = audioRef.current;
        if(audio) {
            audio.onloadedmetadata = () => {
                const minutes = Math.floor(audio.duration / 60);
                const seconds = Math.floor(audio.duration % 60);
                setDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            };
            audio.onended = () => setIsPlaying(false);
        }
         return () => {
            if(audio) {
                audio.onloadedmetadata = null;
                audio.onended = null;
            }
        }
    }, [])

    return (
        <div className="flex items-center gap-2">
            <audio ref={audioRef} src={audioUrl} preload="metadata" />
             <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePlayPause}
                className="h-8 w-8"
             >
                {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
            </Button>
            <div className="w-28 h-1 bg-muted rounded-full" />
             <span className="text-xs text-muted-foreground">{duration}</span>
        </div>
    )
}

const PauseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);


const MessageItem = ({ message, onViewImage }: { message: Message, onViewImage: (url: string) => void }) => {
  const { user: currentUser } = useAuth();
  const [sender, setSender] = React.useState<User | null>(null);
  const isMe = message.senderId === currentUser?.uid;

  React.useEffect(() => {
    const fetchSender = async () => {
      if (message.senderId) {
        const userDoc = await getDoc(doc(db, "users", message.senderId));
        if (userDoc.exists()) {
          setSender({ id: userDoc.id, ...userDoc.data() } as User);
        }
      }
    };
    fetchSender();
  }, [message.senderId]);


  if (!sender) return null;

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "";
    return name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  }
  
  const isMedia = ['image', 'video'].includes(message.type);

  if (message.type === 'call' && message.callInfo) {
      const isVideo = message.callInfo.type === 'video';
      const isMissed = message.callInfo.status === 'missed';
      const durationText = message.callInfo.duration ? ` • ${formatCallDuration(message.callInfo.duration)}` : '';

      let callText = '';
      if (isMissed) {
          callText = isMe ? `You missed a ${isVideo ? 'video ' : ''}call` : `Missed ${isVideo ? 'video ' : ''}call`;
      } else {
          callText = isVideo ? 'Video call ended' : 'Call ended';
          callText += durationText;
      }
      
      let Icon;
      if (isMissed) {
        Icon = isVideo ? VideoOff : PhoneMissed;
      } else {
        Icon = isVideo ? Video : PhoneForwarded;
      }


      return (
        <div className="flex justify-center items-center my-2">
            <div className="text-xs text-muted-foreground flex items-center gap-2 p-2 rounded-full bg-card">
               <Icon className={cn("h-4 w-4", isMissed && 'text-destructive')} />
               <span>{callText}</span>
               <span>{message.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </div>
      )
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3",
        isMe ? "justify-end" : "justify-start"
      )}
    >
      {!isMe && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={sender.photoURL} data-ai-hint="person face" />
          <AvatarFallback>{getInitials(sender.displayName)}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-xs md:max-w-md rounded-lg relative group",
           isMe
            ? "bg-primary text-primary-foreground"
            : "bg-card",
           message.text ? (isMedia ? "p-1" : "p-3") : "p-1",
           message.type === "voice" && 'p-2'
        )}
      >
        {!isMe && !isMedia && (
          <p className="text-xs font-semibold text-primary mb-1">{sender.displayName}</p>
        )}
         <div className={cn(
            'flex flex-col',
            isMedia && message.text && 'gap-2'
         )}>
            {message.type === 'image' && message.attachmentUrl && (
            <button onClick={() => onViewImage(message.attachmentUrl!)} className="w-full">
                <Image
                src={message.attachmentUrl}
                alt={message.fileName || "attachment"}
                className="rounded-md object-cover"
                data-ai-hint="chat image"
                width={300}
                height={200}
                />
            </button>
            )}
            {message.type === 'video' && message.attachmentUrl && (
                <video
                    src={message.attachmentUrl}
                    controls
                    className="rounded-md w-full max-w-xs"
                    preload="metadata"
                />
            )}
            {message.type === 'document' && message.attachmentUrl && (
                <div className="flex items-center gap-3 p-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate">{message.fileName}</p>
                        <p className="text-xs text-muted-foreground">{message.fileSize ? (message.fileSize / 1024 / 1024).toFixed(2) + ' MB' : ''}</p>
                    </div>
                    <a href={message.attachmentUrl} download={message.fileName} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon">
                            <Download className="h-5 w-5"/>
                        </Button>
                    </a>
                </div>
            )}
            {message.type === 'voice' && message.attachmentUrl && (
                <VoiceMessagePlayer audioUrl={message.attachmentUrl} />
            )}
            {message.text && (
                <p className={cn("text-sm whitespace-pre-wrap", isMedia && "px-3 pb-2")}>
                    {message.text}
                </p>
            )}
         </div>
        
         <p className="text-xs mt-1 opacity-70 text-right px-2 pb-1">
            {message.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>

        {message.reactions && (
          <div className="absolute -bottom-3 right-2 flex gap-1">
            {Object.entries(message.reactions).map(([emoji, userIds]) => (
              <div
                key={emoji}
                className="bg-card border rounded-full px-2 py-0.5 text-xs shadow"
              >
                {emoji} {userIds.length}
              </div>
            ))}
          </div>
        )}
      </div>
      {isMe && currentUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={sender.photoURL || ''} data-ai-hint="person avatar" />
          <AvatarFallback>{getInitials(sender.displayName)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};


const AttachmentPreview = ({
  file,
  onClose,
  onSend,
  uploadProgress,
  isSending,
}: {
  file: File;
  onClose: () => void;
  onSend: (file: File, caption: string) => void;
  uploadProgress: number;
  isSending: boolean;
}) => {
  const [caption, setCaption] = React.useState("");
  const fileUrl = React.useMemo(() => URL.createObjectURL(file), [file]);
  const fileType = getFileType(file);

  const handleSend = () => {
    onSend(file, caption);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 bg-transparent border-0 max-w-4xl w-full h-auto sm:max-w-lg">
         <DialogTitle className="sr-only">Attachment Preview</DialogTitle>
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm">
            <header className="flex items-center justify-end p-2 absolute top-0 right-0 z-10">
              <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:text-white hover:bg-white/10">
                <X className="h-5 w-5" />
              </Button>
            </header>

            <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
              <div className="relative w-full h-full flex items-center justify-center">
                {fileType === "image" && (
                  <Image
                    src={fileUrl}
                    alt="Preview"
                    layout="fill"
                    objectFit="contain"
                  />
                )}
                {fileType === "video" && (
                  <video src={fileUrl} controls autoPlay className="max-w-full max-h-full rounded-md" />
                )}
                {fileType === "document" && (
                  <div className="flex flex-col items-center gap-4 text-white">
                      <FileText className="h-32 w-32" />
                      <p className="font-semibold text-xl">{file.name}</p>
                      <p className="text-muted-foreground text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
              </div>
            </div>
            
            {isSending && <Progress value={uploadProgress} className="h-1 bg-background/20" />}
            
            <footer className="p-4 bg-transparent flex items-center gap-2">
               <Input
                placeholder="Caption (optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-300"
                disabled={isSending}
               />
               <Button type="button" size="icon" className="bg-accent hover:bg-accent/90 aspect-square h-10 w-10" onClick={handleSend} disabled={isSending}>
                 {isSending ? <Loader2 className="animate-spin" /> : <Send />}
               </Button>
            </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
};


const getFileType = (file: File): 'image' | 'video' | 'document' => {
      if (file.type.startsWith('image/')) return 'image';
      if (file.type.startsWith('video/')) return 'video';
      return 'document';
}

export function ChatView({ chat, onExitChat, onInitiateCall }: { chat: Chat, onExitChat: () => void, onInitiateCall: (type: 'audio' | 'video') => void }) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = React.useState(true);
  const [inputText, setInputText] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [dialogAction, setDialogAction] = React.useState<'clear' | 'block' | 'delete' | null>(null);
  const isMobile = useIsMobile();
  const [otherUser, setOtherUser] = React.useState<User | null>(null);
  const [isInfoOpen, setIsInfoOpen] = React.useState(false);
  const [viewedImage, setViewedImage] = React.useState<string | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [attachment, setAttachment] = React.useState<File | null>(null);
  
  const otherUserId = chat.members.find(m => m !== user?.uid);
  const isBlocked = userProfile?.blockedUsers?.includes(otherUserId || '');
  
  // Effect for fetching messages
  React.useEffect(() => {
    if (!chat.id) return;
    setLoadingMessages(true);
    const messagesCol = collection(db, "chats", chat.id, "messages");
    const q = query(messagesCol, orderBy("timestamp", "asc"));
    
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(msgs);
        setLoadingMessages(false);
    });

     return () => {
        unsubscribeMessages();
    }
  }, [chat.id]);

  // Effect to get other user's data
  React.useEffect(() => {
      const fetchOtherUser = async () => {
          if (!otherUserId) return;
          const userDoc = await getDoc(doc(db, "users", otherUserId));
          if(userDoc.exists()) {
              setOtherUser({id: userDoc.id, ...userDoc.data()} as User);
          }
      }
      fetchOtherUser();
  }, [otherUserId]);


  React.useEffect(() => {
    // scroll to bottom
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.children[1] as HTMLDivElement;
        if(viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);


  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isBlocked || isSending || !inputText.trim()) return;
    
    const text = inputText.trim();
    if (!text) return;
    
    setIsSending(true);

    try {
        const messagesCol = collection(db, "chats", chat.id, "messages");
        await addDoc(messagesCol, {
            senderId: user?.uid,
            text: text,
            timestamp: serverTimestamp(),
            type: 'text',
        });

        const chatRef = doc(db, "chats", chat.id);
        await updateDoc(chatRef, {
            lastMessage: text,
            lastMessageTimestamp: serverTimestamp(),
            lastMessageSenderId: user?.uid,
        });

    } catch (error) {
        console.error("Error sending message:", error);
        toast({ title: "Error", description: "Could not send message.", variant: "destructive"});
    } finally {
        setIsSending(false);
        setInputText("");
    }
  }

  const handleSendAttachment = async (file: File, caption: string) => {
     if (isBlocked || isSending) return;
     setIsSending(true);
     setUploadProgress(0);

     try {
        const fileType = getFileType(file);
        const fileName = file.name;
        const fileSize = file.size;
        
        const storageRef = ref(storage, `chat-attachments/${chat.id}/${Date.now()}_${fileName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        let attachmentUrl: string | undefined = undefined;

        await new Promise<void>((resolve, reject) => {
             uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    console.error("Upload failed:", error);
                    reject(error);
                },
                async () => {
                    attachmentUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve();
                }
            );
        });

        if (!attachmentUrl) throw new Error("File upload failed, no URL obtained.");
        
        const messagesCol = collection(db, "chats", chat.id, "messages");
        await addDoc(messagesCol, {
            senderId: user?.uid,
            text: caption,
            timestamp: serverTimestamp(),
            type: fileType,
            attachmentUrl,
            fileName,
            fileSize,
        });

        let lastMessageText = caption || '';
        if (!caption) {
            if (fileType === 'image') lastMessageText = '📷 Image';
            else if (fileType === 'video') lastMessageText = '📹 Video';
            else if (fileType === 'document') lastMessageText = `📄 ${fileName}`;
        }
        
        const chatRef = doc(db, "chats", chat.id);
        await updateDoc(chatRef, {
            lastMessage: lastMessageText,
            lastMessageTimestamp: serverTimestamp(),
            lastMessageSenderId: user?.uid,
        });

        setAttachment(null);

     } catch (error) {
        console.error("Error sending attachment:", error);
        toast({ title: "Error", description: "Could not send attachment.", variant: "destructive"});
     } finally {
        setIsSending(false);
        setUploadProgress(0);
     }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setAttachment(file);
      }
      if (fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  }

  const handleClosePreview = () => {
      setAttachment(null);
  }

  const handleVoiceMessageSent = () => {
    setIsRecording(false);
  }

  const startRecording = () => {
      if(isBlocked) return;
      setIsRecording(true);
  }

  const handleMuteToggle = async () => {
    if (!chat.id) return;
    const newMutedState = !chat.muted;
    const chatRef = doc(db, "chats", chat.id);
    await updateDoc(chatRef, { muted: newMutedState });
    toast({ title: newMutedState ? "Chat muted" : "Chat unmuted" });
  }

  const handleClearChat = async () => {
      const messagesRef = collection(db, "chats", chat.id, "messages");
      const q = query(messagesRef);
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
      });
      await batch.commit();

      const chatRef = doc(db, "chats", chat.id);
      await updateDoc(chatRef, { 
          lastMessage: "Chat cleared",
          lastMessageTimestamp: serverTimestamp(),
      });
      toast({ title: "Chat cleared" });
      setDialogAction(null);
  }

  const handleDeleteChat = async () => {
      const chatRef = doc(db, "chats", chat.id);
      await deleteDoc(chatRef);
      toast({ title: "Chat deleted" });
      onExitChat();
      setDialogAction(null);
  }

  const handleBlockUser = async () => {
      if (!user || !otherUserId) return;
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
          blockedUsers: isBlocked ? arrayRemove(otherUserId) : arrayUnion(otherUserId)
      });
      await refreshUserProfile();
      toast({ title: isBlocked ? "User unblocked" : "User blocked"});
      setDialogAction(null);
  }

  const handleConfirmAction = () => {
      switch(dialogAction) {
          case 'clear':
              handleClearChat();
              break;
          case 'delete':
              handleDeleteChat();
              break;
          case 'block':
              handleBlockUser();
              break;
          default:
              setDialogAction(null);
      }
  }

  const getDialogContent = () => {
      switch(dialogAction) {
          case 'clear':
              return { title: "Clear this chat?", description: "This will permanently delete all messages in this conversation." };
          case 'delete':
              return { title: "Delete this chat?", description: "This action cannot be undone. The chat will be removed from your list." };
          case 'block':
              return { title: isBlocked ? `Unblock ${chat.name}?` : `Block ${chat.name}?`, description: isBlocked ? "You will be able to send and receive messages again." : "You will no longer be able to send or receive messages from this user." };
          default:
              return { title: "", description: "" };
      }
  }
  
  return (
    <>
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between p-3 border-b bg-card">
          <div className="flex items-center gap-3">
             {isMobile && (
              <Button variant="ghost" size="icon" onClick={onExitChat} className="mr-1">
                <ArrowLeft />
              </Button>
            )}
            <button onClick={() => setViewedImage(chat.avatar)}>
                <Avatar>
                    <AvatarImage src={chat.avatar} data-ai-hint={chat.type === 'group' ? 'group symbol' : 'person portrait'} />
                    <AvatarFallback>{chat.name ? chat.name[0] : 'C'}</AvatarFallback>
                </Avatar>
            </button>
            <button onClick={() => setIsInfoOpen(true)}>
                <div className="text-left">
                    <h2 className="font-semibold font-headline text-lg">{chat.name}</h2>
                    <p className="text-sm text-muted-foreground">
                        {chat.online ? "Online" : "Offline"}
                        {chat.type === 'group' && ` • ${chat.members.length} members`}
                    </p>
                </div>
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onInitiateCall('audio')} disabled={isBlocked}>
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onInitiateCall('video')} disabled={isBlocked}>
              <Video className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsInfoOpen(true)}>
                  <Info className="mr-2 h-4 w-4" />
                  <span>View Contact</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleMuteToggle}>
                  {chat.muted ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
                  <span>{chat.muted ? 'Unmute' : 'Mute'} Notifications</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDialogAction('clear')}>
                  <Eraser className="mr-2 h-4 w-4" />
                  <span>Clear chat</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDialogAction('block')} className={cn(isBlocked && "text-green-600 focus:text-green-700")}>
                  <CircleSlash className="mr-2 h-4 w-4"/>
                  <span>{isBlocked ? 'Unblock' : 'Block'} user</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDialogAction('delete')} className="text-destructive focus:text-destructive">
                   <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete chat</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          <div className="p-4 space-y-6">
            {loadingMessages ? (
              <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              messages.map((message) => (
                  <MessageItem key={message.id} message={message} onViewImage={setViewedImage} />
              ))
            )}
            {isBlocked && (
                <div className="text-center text-sm text-muted-foreground p-4 bg-card rounded-lg">
                    You have blocked this user. You can't send or receive messages.
                </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-4 bg-card border-t">
          {isRecording ? (
                <VoiceRecorder 
                    chatId={chat.id}
                    onRecordingSent={handleVoiceMessageSent}
                    onCancel={() => setIsRecording(false)}
                />
          ) : (
            <form className="flex items-center gap-2" onSubmit={handleSendMessage}>
                <Button variant="ghost" size="icon" type="button">
                  <Smile />
                </Button>
                <Button variant="ghost" size="icon" type="button" onClick={() => fileInputRef.current?.click()} disabled={isSending || isBlocked}>
                  <Paperclip />
                </Button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                />
                <Input 
                  placeholder={isBlocked ? "You can't reply to this conversation" : "Type a message..." }
                  className="flex-1"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isSending || isBlocked}
                />
                 {inputText.trim() ? (
                    <Button type="submit" size="icon" className="bg-accent hover:bg-accent/90" disabled={isSending || isBlocked}>
                        {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                    </Button>
                 ) : (
                    <Button 
                        type="button" 
                        size="icon" 
                        className="bg-accent hover:bg-accent/90" 
                        disabled={isSending || isBlocked}
                        onClick={startRecording}
                    >
                        <Mic />
                    </Button>
                 )}
            </form>
          )}
        </div>
      </div>
      
      {attachment && (
        <AttachmentPreview 
          file={attachment} 
          onClose={handleClosePreview} 
          onSend={handleSendAttachment}
          uploadProgress={uploadProgress}
          isSending={isSending}
        />
      )}

      <AlertDialog open={!!dialogAction} onOpenChange={(open) => !open && setDialogAction(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{getDialogContent().title}</AlertDialogTitle>
                <AlertDialogDescription>
                    {getDialogContent().description}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDialogAction(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmAction}>
                    Continue
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {otherUser && <UserInfoSheet user={otherUser} open={isInfoOpen} onOpenChange={setIsInfoOpen} onViewImage={setViewedImage} />}
      
      {viewedImage && <ImageViewDialog imageUrl={viewedImage} onOpenChange={() => setViewedImage(null)} />}
    </>
  );
}

    

    