// lib/local-voice.sdk.ts
import { io, Socket } from 'socket.io-client';

export interface VoiceSessionConfig {
  userId: string;
  userName: string;
  type: 'interview' | 'generate';
  questions?: string[];
  interviewId?: string;
  role?: string;
  level?: string;
  techStack?: string;
  focus?: string;
}

export interface TranscriptMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface AgentMessage {
  type: 'greeting' | 'response' | 'question';
  text: string;
  audio?: string;
  timestamp: Date;
}

export class LocalVoiceSDK extends EventTarget {
  private socket: Socket | null = null;
  private serverUrl: string;
  private isConnected: boolean = false;
  private currentSession: VoiceSessionConfig | null = null;

  constructor(serverUrl: string = 'http://localhost:8080') {
    super();
    this.serverUrl = serverUrl;
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl, {
        transports: ['websocket'],
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('Connected to local voice agent');
        this.isConnected = true;
        this.setupEventListeners();
        resolve(true);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection failed:', error);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from voice agent');
        this.isConnected = false;
        this.dispatchEvent(new CustomEvent('disconnect'));
      });
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('agent-message', (message: AgentMessage) => {
      this.dispatchEvent(new CustomEvent('agent-message', { 
        detail: message 
      }));
    });

    this.socket.on('transcript-update', (message: TranscriptMessage) => {
      this.dispatchEvent(new CustomEvent('transcript-update', { 
        detail: message 
      }));
    });

    this.socket.on('session-ended', (data) => {
      this.dispatchEvent(new CustomEvent('session-ended', { 
        detail: data 
      }));
    });

    this.socket.on('error', (error) => {
      this.dispatchEvent(new CustomEvent('error', { 
        detail: error 
      }));
    });
  }

  async startSession(config: VoiceSessionConfig): Promise<void> {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to voice agent server');
    }

    this.currentSession = config;
    this.socket.emit('start-session', config);
  }

  sendAudioChunk(audioData: string): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to voice agent server');
    }

    this.socket.emit('audio-chunk', audioData);
  }

  endSession(): void {
    if (this.socket) {
      this.socket.emit('end-session');
    }
    this.currentSession = null;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.currentSession = null;
  }

  isSessionActive(): boolean {
    return this.isConnected && this.currentSession !== null;
  }

  getCurrentSession(): VoiceSessionConfig | null {
    return this.currentSession;
  }

  // Helper method to check server health
  async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/health`);
      const data = await response.json();
      return data.status === 'ok';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const localVoiceSDK = new LocalVoiceSDK();

// Helper function for easy integration
export const initializeVoiceAgent = async (serverUrl?: string): Promise<LocalVoiceSDK> => {
  const sdk = serverUrl ? new LocalVoiceSDK(serverUrl) : localVoiceSDK;
  
  // Check if server is healthy
  const isHealthy = await sdk.checkServerHealth();
  if (!isHealthy) {
    throw new Error('Voice agent server is not available. Please make sure it\'s running.');
  }

  // Connect to server
  await sdk.connect();
  return sdk;
};

// Audio recording utilities
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async initialize(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize audio recorder:', error);
      return false;
    }
  }

  startRecording(onDataAvailable?: (audioData: string) => void): void {
    if (!this.mediaRecorder) {
      throw new Error('Audio recorder not initialized');
    }

    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
        
        // Convert to base64 and send immediately if callback provided
        if (onDataAvailable) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            const audioData = base64.split(',')[1]; // Remove data URL prefix
            onDataAvailable(audioData);
          };
          reader.readAsDataURL(event.data);
        }
      }
    };

    this.mediaRecorder.start(1000); // Record in 1-second chunks
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(new Blob());
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}

export { Socket } from 'socket.io-client';