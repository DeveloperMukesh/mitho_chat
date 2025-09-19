
import { db } from './firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
  DocumentReference,
  Unsubscribe,
  deleteField,
  CollectionReference,
  writeBatch,
  getDocs,
} from 'firebase/firestore';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

interface WebRTCManagerOptions {
    onTrack: (event: RTCTrackEvent) => void;
    onIceCandidate: (candidate: RTCIceCandidate) => void;
    onConnectionStateChange: (state: RTCPeerConnectionState) => void;
}

export class WebRTCManager {
  public pc: RTCPeerConnection;
  private isCaller: boolean = false;

  constructor(options: WebRTCManagerOptions) {
    this.pc = new RTCPeerConnection(servers);
    this.pc.ontrack = options.onTrack;
    this.pc.onicecandidate = (event) => {
        if (event.candidate) {
            options.onIceCandidate(event.candidate);
        }
    };
    this.pc.onconnectionstatechange = () => {
        if (this.pc.connectionState) {
            options.onConnectionStateChange(this.pc.connectionState)
        }
    };
  }
  
  addTrack(track: MediaStreamTrack, stream: MediaStream) {
      if (this.pc.signalingState === 'closed') return;
      this.pc.addTrack(track, stream);
  }
  
  async createOffer(): Promise<RTCSessionDescriptionInit> {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.isCaller = true;
      return offer;
  }
  
  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
      await this.setRemoteDescription(offer);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      return answer;
  }
  
  async setRemoteDescription(description: RTCSessionDescriptionInit) {
      if (this.pc.signalingState !== 'closed') {
          await this.pc.setRemoteDescription(new RTCSessionDescription(description));
      }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
      if (this.pc.signalingState !== 'closed' && candidate) {
        try {
            await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.error('Error adding received ice candidate', e);
        }
      }
  }

  toggleMute(): boolean {
    const senders = this.pc.getSenders();
    const audioSender = senders.find(s => s.track?.kind === 'audio');
    if (audioSender && audioSender.track) {
        audioSender.track.enabled = !audioSender.track.enabled;
        return !audioSender.track.enabled;
    }
    return false;
  }

  toggleCamera(): boolean {
    const senders = this.pc.getSenders();
    const videoSender = senders.find(s => s.track?.kind === 'video');
    if (videoSender && videoSender.track) {
        videoSender.track.enabled = !videoSender.track.enabled;
        return !videoSender.track.enabled;
    }
    return false;
  }
  
  hangUp() {
    this.pc.getSenders().forEach(sender => {
        if (sender.track) {
            sender.track.stop();
        }
    });
    if (this.pc.signalingState !== 'closed') {
        this.pc.close();
    }
  }
}
