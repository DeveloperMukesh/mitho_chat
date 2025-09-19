
"use client";

import * as React from "react";
import { Trash2, Send, Pause, Play, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { storage, db } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";

const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60).toString().padStart(2, "0");
    const seconds = (time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
};

const Waveform = ({ audioData }: { audioData: Uint8Array }) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !audioData) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const height = canvas.height;
        const width = canvas.width;
        
        context.clearRect(0, 0, width, height);
        context.fillStyle = 'hsl(var(--muted-foreground))';
        
        const barWidth = 2;
        const gap = 1;
        const numBars = Math.floor(width / (barWidth + gap));
        const step = Math.floor(audioData.length / numBars);

        for (let i = 0; i < numBars; i++) {
            const barHeight = (audioData[i * step] / 255) * height;
            const y = height - barHeight;
            context.fillRect(i * (barWidth + gap), y, barWidth, barHeight);
        }

    }, [audioData]);

    return <canvas ref={canvasRef} className="w-full h-8" width="200" height="32" />;
};


export const VoiceRecorder = ({ chatId, onRecordingSent, onCancel }: { chatId: string, onRecordingSent: () => void, onCancel: () => void }) => {
    const { user } = useAuth();
    const [duration, setDuration] = React.useState(0);
    const [isSending, setIsSending] = React.useState(false);
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const recordingChunksRef = React.useRef<Blob[]>([]);
    const animationFrameRef = React.useRef<number>();
    const audioContextRef = React.useRef<AudioContext | null>(null);
    const analyserRef = React.useRef<AnalyserNode | null>(null);
    const dataArrayRef = React.useRef<Uint8Array | null>(null);
    const [waveform, setWaveform] = React.useState<Uint8Array>(new Uint8Array(64));
    
    React.useEffect(() => {
        const start = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorderRef.current = new MediaRecorder(stream);
                
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                const source = audioContextRef.current.createMediaStreamSource(stream);
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 128;
                source.connect(analyserRef.current);
                dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

                recordingChunksRef.current = [];

                mediaRecorderRef.current.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        recordingChunksRef.current.push(event.data);
                    }
                };

                mediaRecorderRef.current.onstop = () => {
                    stream.getTracks().forEach(track => track.stop());
                    if(audioContextRef.current?.state !== 'closed') {
                       audioContextRef.current?.close();
                    }
                    if(animationFrameRef.current) {
                        cancelAnimationFrame(animationFrameRef.current);
                    }
                };

                mediaRecorderRef.current.start();
                
                const timerInterval = setInterval(() => {
                    setDuration(prev => prev + 1);
                }, 1000);

                const draw = () => {
                    if (analyserRef.current && dataArrayRef.current) {
                        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                        setWaveform(new Uint8Array(dataArrayRef.current));
                        animationFrameRef.current = requestAnimationFrame(draw);
                    }
                };
                draw();
                
                return () => {
                     if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                        mediaRecorderRef.current.stop();
                    }
                    clearInterval(timerInterval);
                    if(animationFrameRef.current) {
                        cancelAnimationFrame(animationFrameRef.current);
                    }
                };

            } catch (err) {
                console.error('Error starting recording:', err);
                toast({
                    title: 'Microphone access denied',
                    description: 'Please enable microphone permissions in your browser to send voice messages.',
                    variant: 'destructive',
                });
                onCancel();
            }
        }
        start();
        
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
            }
             if(animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const sendVoiceMessage = async () => {
        if (!user || !chatId || recordingChunksRef.current.length === 0) return;
        setIsSending(true);

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }

        const audioBlob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });

        try {
            const storageRef = ref(storage, `voice-messages/${chatId}/${Date.now()}.webm`);
            await uploadBytes(storageRef, audioBlob);
            const downloadURL = await getDownloadURL(storageRef);

            const messagesCol = collection(db, "chats", chatId, "messages");
            await addDoc(messagesCol, {
                senderId: user.uid,
                timestamp: serverTimestamp(),
                type: 'voice',
                attachmentUrl: downloadURL,
            });

            const chatRef = doc(db, "chats", chatId);
            await updateDoc(chatRef, {
                lastMessage: '🎤 Voice message',
                lastMessageTimestamp: serverTimestamp(),
                lastMessageSenderId: user.uid,
            });
            onRecordingSent();
        } catch (error) {
            console.error("Error sending voice message:", error);
            toast({ title: "Error", description: "Could not send voice message.", variant: "destructive"});
        } finally {
            setIsSending(false);
        }
    };
    
    const handleCancel = () => {
         if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        onCancel();
    }
    
    return (
        <div className="flex items-center gap-2 h-10 w-full">
            <Button variant="ghost" size="icon" onClick={handleCancel} disabled={isSending}>
                <Trash2 className="text-destructive" />
            </Button>
            <div className="flex-1 flex items-center gap-3 bg-muted h-full rounded-md px-3">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <p className="text-sm font-mono">{formatTime(duration)}</p>
                <Waveform audioData={waveform} />
            </div>
             <Button type="button" size="icon" className="bg-accent hover:bg-accent/90" disabled={isSending} onClick={sendVoiceMessage}>
                {isSending ? <Loader2 className="animate-spin" /> : <Send />}
            </Button>
        </div>
    )
}
