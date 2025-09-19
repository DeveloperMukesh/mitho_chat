
"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Chat, Call, User } from "@/lib/data";
import { useAuth } from "@/hooks/use-auth";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  User as UserIcon,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDraggable } from "@/hooks/use-draggable";
import { useToast } from "@/hooks/use-toast";
import { WebRTCManager } from "@/lib/webrtc";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, collection, addDoc, getDocs, writeBatch, Unsubscribe, getDoc, serverTimestamp } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

const CallTimer = ({ startTime }: { startTime: Date | null }) => {
  const [duration, setDuration] = React.useState(0);

  React.useEffect(() => {
    if (!startTime) {
      setDuration(0);
      return;
    };

    const interval = setInterval(() => {
        const seconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
        setDuration(seconds);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  if (!startTime) return null;

  return (
    <div className="flex items-center gap-2 rounded-md bg-black/30 px-3 py-1.5 text-sm font-medium text-white">
      <Timer className="h-4 w-4" />
      <span>{formatTime(duration)}</span>
    </div>
  );
};

export const CallView = ({
  contact,
  initialCallState,
  onEndCall,
}: {
  contact: Chat;
  initialCallState: Call & {callerUser?: User};
  onEndCall: (duration: number) => void;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [call, setCall] = React.useState(initialCallState);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isCameraOff, setIsCameraOff] = React.useState(initialCallState.type === 'audio');
  const [callStartTime, setCallStartTime] = React.useState<Date | null>(null);
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = React.useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = React.useState(true);

  const localVideoRef = React.useRef<HTMLVideoElement>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement>(null);
  const draggableRef = useDraggable<HTMLDivElement>();
  const outgoingCallAudioRef = React.useRef<HTMLAudioElement>(null);
  
  const webRtcManagerRef = React.useRef<WebRTCManager | null>(null);
  const callEndedRef = React.useRef(false);

  const isCaller = call.callerId === user?.uid;
  
  const isRemoteVideoActive = remoteStream?.getVideoTracks().some(t => t.enabled && !t.muted);


  // Effect for getting media permissions and stream
  React.useEffect(() => {
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: call.type === 'video',
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        // If it's a video call, the camera is initially on by default
        setIsCameraOff(call.type === 'audio');
        setHasCameraPermission(true);
      } catch (error: any) {
        console.error('Error accessing media devices:', error);
        setHasCameraPermission(false);
        let title = 'Media Access Denied';
        let description = 'Please enable camera and microphone permissions in your browser settings.';

        if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            title = "Device Not Found";
            description = "Could not find a camera or microphone. You can still join the call.";
        }
        
        toast({
          variant: 'destructive',
          title: title,
          description: description,
        });
        // Do not end the call, allow user to stay in call.
      }
    };

    getMedia();
    
    return () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.type]);


  // Effect for WebRTC logic, depends on having permissions
  React.useEffect(() => {
    if (!user || !call?.id) return;

    const manager = new WebRTCManager({
        onTrack: (event) => {
            const stream = event.streams[0];
            setRemoteStream(stream);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
            }
        },
        onIceCandidate: async (candidate) => {
            if(!call?.id) return;
            const candidateCollection = collection(db, 'calls', call.id, isCaller ? 'callerCandidates' : 'calleeCandidates');
            await addDoc(candidateCollection, candidate.toJSON());
        },
        onConnectionStateChange: (state) => {
             if (['disconnected', 'failed', 'closed'].includes(state)) {
                handleEndCall();
            }
            if (state === 'connected' && remoteVideoRef.current) {
                remoteVideoRef.current.muted = false;
            }
        }
    });
    webRtcManagerRef.current = manager;

    if (localStream) {
        localStream.getTracks().forEach(track => manager.addTrack(track, localStream));
    }
    
    const callDocRef = doc(db, 'calls', call.id);

    let unsubscribeCandidates: Unsubscribe;

    const setupSignaling = async () => {
        if (isCaller) {
            const calleeCandidates = collection(callDocRef, 'calleeCandidates');
            unsubscribeCandidates = onSnapshot(calleeCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        manager.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                    }
                });
            });

            const offer = await manager.createOffer();
            await updateDoc(callDocRef, { offer });

        } else { // Callee
             const callerCandidates = collection(callDocRef, 'callerCandidates');
            unsubscribeCandidates = onSnapshot(callerCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        manager.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                    }
                });
            });
            const callDocSnap = await getDoc(callDocRef);
            if (callDocSnap.exists()) {
                const callData = callDocSnap.data();
                if (callData?.offer) {
                    const answer = await manager.createAnswer(callData.offer);
                    await updateDoc(callDocRef, { answer });
                }
            }
        }
    };
    
    setupSignaling();

    const universalUnsub = onSnapshot(callDocRef, (docSnap) => {
      const callData = docSnap.data();
      if(!docSnap.exists() || callData?.status === 'ended' || callData?.status === 'declined') {
        handleEndCall();
      } else {
        const fullCallData = { id: docSnap.id, ...callData} as Call;
        setCall(fullCallData);
        
        if (isCaller && callData?.answer && manager.pc.remoteDescription?.type !== 'answer') {
            manager.setRemoteDescription(callData.answer);
        }

        if(callData?.status === 'connected' && !callStartTime) {
           setCallStartTime(new Date());
           outgoingCallAudioRef.current?.pause();
        }
      }
    });

    return () => {
        unsubscribeCandidates?.();
        universalUnsub();
        if (webRtcManagerRef.current) {
            webRtcManagerRef.current.hangUp();
            webRtcManagerRef.current = null;
        }
    };
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream, user, call.id]);


  const handleEndCall = async () => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;

    outgoingCallAudioRef.current?.pause();

    let duration = 0;
    if (callStartTime) {
        duration = Math.floor((new Date().getTime() - callStartTime.getTime()) / 1000);
    }
    
    if (webRtcManagerRef.current) {
        webRtcManagerRef.current.hangUp();
        webRtcManagerRef.current = null;
    }

    onEndCall(duration);
  }

  const toggleMute = () => {
    if (!hasCameraPermission) return;
    const newMuteState = webRtcManagerRef.current?.toggleMute() ?? !isMuted;
    setIsMuted(newMuteState);
  };
  
  const toggleCamera = () => {
    if (call.type !== 'video' || !hasCameraPermission) return;
    const newCameraState = webRtcManagerRef.current?.toggleCamera() ?? !isCameraOff;
    setIsCameraOff(newCameraState);
  };

  const getInitials = (name: string) => {
    if (!name) return "";
    return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const getCallStatusText = () => {
      if (call.status === 'ringing') {
          return isCaller ? 'Ringing...' : 'Incoming call...';
      }
      if (callStartTime) {
          return 'In Call';
      }
      return 'Connecting...';
  }

  return (
    <div className="relative flex h-dvh w-full flex-col items-center justify-between bg-black text-white p-4 md:p-8 overflow-hidden">
        {isCaller && call.status === 'ringing' && (
            <audio ref={outgoingCallAudioRef} src="/sounds/outgoing-call.mp3" autoPlay loop />
        )}
      {/* Remote Video Background - GUARANTEED FULLSCREEN */}
      <div className="absolute inset-0 z-0">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          {/* Fallback avatar view when video is off */}
          <div className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-4 text-center bg-gray-800 transition-opacity",
            isRemoteVideoActive ? 'opacity-0' : 'opacity-100'
          )}>
              <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                <AvatarImage src={contact.avatar} />
                <AvatarFallback className="text-4xl">
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-3xl font-bold font-headline">{contact.name}</h1>
              <p className="text-muted-foreground text-gray-300">{getCallStatusText()}</p>
          </div>
      </div>
      
      {/* Top Bar with Timer and Draggable Local Video */}
      <div className="relative z-20 w-full flex justify-between items-start">
           <div className="flex-grow flex justify-center">
            <CallTimer startTime={callStartTime} />
          </div>
      </div>

       {/* Draggable local video - picture-in-picture */}
      <div
        ref={draggableRef}
        className="w-32 md:w-48 touch-none cursor-move rounded-lg shadow-lg overflow-hidden absolute top-4 left-4 z-30"
      >
        <video
          ref={localVideoRef}
          className={cn("h-full w-full object-cover", { 'hidden': isCameraOff || !localStream })}
          autoPlay
          muted
          playsInline
        />
          {(isCameraOff || !localStream) && (
              <div className="flex h-full aspect-video w-full items-center justify-center bg-black text-white">
                {!hasCameraPermission ? (
                      <Alert variant="destructive" className="border-0 p-2 bg-transparent text-white">
                          <AlertTitle className="text-xs">Cam Off</AlertTitle>
                      </Alert>
                ) : (
                    <UserIcon className="h-8 w-8 md:h-10 md:w-10" />
                )}
            </div>
        )}
      </div>


      {/* Call Controls always at bottom */}
      <div className="relative z-20 flex items-center justify-center gap-4 rounded-full bg-black/40 p-4">
        <Button
          onClick={toggleMute}
          variant="secondary"
          size="icon"
          className="h-14 w-14 rounded-full bg-white/20 hover:bg-white/30 text-white"
          disabled={!hasCameraPermission}
        >
          {isMuted ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>
        {call.type === "video" && (
          <Button
            onClick={toggleCamera}
            variant="secondary"
            size="icon"
            className="h-14 w-14 rounded-full bg-white/20 hover:bg-white/30 text-white"
            disabled={!hasCameraPermission}
          >
            {isCameraOff ? (
              <VideoOff className="h-6 w-6" />
            ) : (
              <Video className="h-6 w-6" />
            )}
          </Button>
        )}
        <Button
          onClick={() => handleEndCall()}
          variant="destructive"
          size="icon"
          className="h-14 w-14 rounded-full"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

    

    

    