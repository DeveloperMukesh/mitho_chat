
"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Call, User } from "@/lib/data";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
}

export const IncomingCallDialog = ({ call, onAccept, onDecline }: { call: Call & { callerUser?: User }, onAccept: () => void, onDecline: () => void }) => {
    const { userProfile } = useAuth();
    const audioRef = React.useRef<HTMLAudioElement>(null);

    React.useEffect(() => {
        if (audioRef.current) {
            audioRef.current.play().catch(e => console.error("Ringtone autoplay was blocked by the browser."));
        }
    }, []);

    const handleAction = (action: 'accept' | 'decline') => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
        if (action === 'accept') {
            onAccept();
        } else {
            onDecline();
        }
    }

    if(!call.callerUser) return null;

    const ringtoneSrc = userProfile?.theme?.ringtoneUrl || '/sounds/incoming-call.mp3';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <audio ref={audioRef} src={ringtoneSrc} loop />
            <Card className="w-full max-w-sm animate-in fade-in-0 zoom-in-95">
                <CardHeader className="text-center items-center">
                    <Avatar className="h-24 w-24 mb-4 border-4 border-primary/50">
                        <AvatarImage src={call.callerUser.photoURL} alt={call.callerUser.handle} />
                        <AvatarFallback className="text-4xl">{getInitials(call.callerUser.displayName)}</AvatarFallback>
                    </Avatar>
                    <CardTitle className="font-headline">{call.callerUser.displayName}</CardTitle>
                    <CardDescription>
                        Incoming {call.type} call...
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center gap-6 p-6">
                     <div className="flex flex-col items-center gap-2">
                        <Button 
                            size="icon" 
                            className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700"
                            onClick={() => handleAction('decline')}
                        >
                            <PhoneOff className="h-8 w-8" />
                        </Button>
                        <span className="text-sm text-muted-foreground">Decline</span>
                    </div>
                     <div className="flex flex-col items-center gap-2">
                        <Button 
                            size="icon" 
                            className="h-16 w-16 rounded-full bg-green-600 hover:bg-green-700"
                            onClick={() => handleAction('accept')}
                        >
                            {call.type === 'video' ? <Video className="h-8 w-8" /> : <Phone className="h-8 w-8" />}
                        </Button>
                        <span className="text-sm text-muted-foreground">Accept</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

    