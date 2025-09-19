
import { Timestamp } from "firebase/firestore";
import type { User as FirebaseUser } from 'firebase/auth';

export type ThemeSettings = {
    mode: 'light' | 'dark' | 'system';
    primaryColor: string;
    ringtoneUrl?: string;
};

export type User = {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  handle: string;
  createdAt?: Timestamp;
  theme?: ThemeSettings;
  friends?: string[];
  friendRequestsSent?: string[];
  friendRequestsReceived?: string[];
  blockedUsers?: string[];
};

export type FriendRequest = {
    id: string;
    from: string;
    to: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: Timestamp;
    fromUser?: User;
}

export type CallInfo = {
    type: 'audio' | 'video';
    status: 'missed' | 'ended';
    duration?: number; // in seconds
}

export type Message = {
  id:string;
  senderId: string;
  text?: string;
  timestamp: Timestamp;
  type: 'text' | 'image' | 'voice' | 'call' | 'video' | 'document';
  attachmentUrl?: string;
  reactions?: { [emoji: string]: string[] };
  edited?: boolean;
  callInfo?: CallInfo;
  fileName?: string;
  fileSize?: number;
};

export type Chat = {
  id: string;
  type: 'direct' | 'group';
  name: string;
  avatar: string;
  members: string[];
  messages?: Message[]; // Messages will be a subcollection
  online?: boolean;
  unreadCount: number;
  lastMessage: string;
  lastMessageTimestamp: Timestamp;
  lastMessageSenderId: string;
  muted?: boolean;
};

export type Call = {
    id: string; 
    chatId: string;
    callerId: string;
    calleeId: string;
    members: string[];
    type: 'audio' | 'video';
    status: 'ringing' | 'connected' | 'declined' | 'ended' | 'missed';
    createdAt: Timestamp;
    endedAt?: Timestamp;
    duration?: number;
    offer?: { sdp: string; type: string };
    answer?: { sdp: string; type: string };
};

    

    