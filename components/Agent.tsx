"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { createFeedback } from "@/lib/actions/general.action";

enum CallStatus {
  INACTIVE = "INACTIVE",
  ACTIVE = "ACTIVE",
  CONNECTING = "CONNECTING",
  FINISHED = "FINISHED",
}

interface TranscriptMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

interface AgentMessage {
  type: string;
  text: string;
  timestamp: Date;
}

interface AgentProps {
  userName: string;
  userId: string;
  type: string;
  interviewId?: string;
  questions?: string[];
  role?: string;
  level?: string;
  techStack?: string;
  focus?: string;
}

const LocalVoiceAgent: React.FC<AgentProps> = ({
  userName,
  userId,
  type,
  interviewId,
  questions = [],
  role,
  level,
  techStack,
  focus,
}) => {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Add this to prevent hydration mismatch
  const [isBrowser, setIsBrowser] = useState(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(null);

  // Set isBrowser to true after first render (client-side only)
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  // Initialize Web Speech API - but only after confirming we're on the client
  useEffect(() => {
    if (!isBrowser) return;

    if (window.speechSynthesis) {
      // Get available voices
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);

        // Choose an English voice by default (preferring female voices)
        const englishVoices = availableVoices.filter((voice) =>
          voice.lang.includes("en")
        );

        // Look for common female voices
        const preferredVoiceNames = [
          "Samantha",
          "Google UK English Female",
          "Microsoft Zira",
        ];
        let preferredVoice = null;

        for (const name of preferredVoiceNames) {
          preferredVoice = englishVoices.find((voice) =>
            voice.name.includes(name)
          );
          if (preferredVoice) break;
        }

        setSelectedVoice(
          preferredVoice || englishVoices[0] || availableVoices[0]
        );
      };

      // Initial load
      loadVoices();

      // Voices are loaded asynchronously
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
        if (speechSynthesisRef.current) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, [isBrowser]);

  // Initialize Socket.IO connection - but only after confirming we're on the client
  useEffect(() => {
    if (!isBrowser) return;

    const socket = io("http://localhost:8080", {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to voice agent server");
      setError(null);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from voice agent server");
      setCallStatus(CallStatus.FINISHED);
    });

    socket.on("agent-message", (message: AgentMessage) => {
      console.log("Received agent message:", message);
      setCurrentMessage(message.text);

      // Use Web Speech API for speech synthesis
      speakText(message.text);
    });

    socket.on("transcript-update", (message: TranscriptMessage) => {
      console.log("Transcript update:", message);
      setTranscript((prev) => [...prev, message]);
    });

    socket.on("session-ended", (data) => {
      console.log("Session ended:", data);
      setTranscript(data.transcript);
      setCallStatus(CallStatus.FINISHED);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
      setError(error.message || "Connection error occurred");
      setCallStatus(CallStatus.INACTIVE);
    });

    return () => {
      socket.disconnect();
    };
  }, [isBrowser]);

  // Handle call end and feedback generation
  useEffect(() => {
    if (!isBrowser) return;

    if (callStatus === CallStatus.FINISHED && transcript.length > 0) {
      if (type === "generate") {
        router.push(`/interview/${interviewId}`);
      } else {
        handleGenerateFeedback();
      }
    }
  }, [callStatus, transcript, type, interviewId, isBrowser, router]);

  // Function to handle text-to-speech using Web Speech API
  const speakText = (text: string) => {
    if (!isBrowser || !window.speechSynthesis) {
      console.error("Speech synthesis not supported");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text);

    // Set selected voice if available
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Settings
    utterance.rate = 1.0; // Speech rate
    utterance.pitch = 1.0; // Speech pitch
    utterance.volume = 1.0; // Volume

    // Event handlers
    utterance.onstart = () => {
      setIsAgentSpeaking(true);
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsAgentSpeaking(false);
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setIsAgentSpeaking(false);
      setIsSpeaking(false);
    };

    // Save reference to current utterance
    speechSynthesisRef.current = utterance;

    // Start speaking
    window.speechSynthesis.speak(utterance);
  };

  const handleGenerateFeedback = async () => {
    if (!interviewId || transcript.length === 0) {
      console.error("Missing interview ID or transcript");
      setError("Cannot generate feedback: missing data");
      return;
    }

    try {
      const { success, message, feedbackId } = await createFeedback({
        interviewId: interviewId,
        userId: userId,
        transcript: transcript,
      });

      if (success && feedbackId) {
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        console.error("Failed to generate feedback:", message);
        setError("Failed to generate feedback");
        router.push(`/interview/${interviewId}`);
      }
    } catch (error) {
      console.error("Error generating feedback:", error);
      setError("Failed to generate feedback");
      router.push(`/interview/${interviewId}`);
    }
  };

  const initializeMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Fix for the recursive call that causes stack overflow
      mediaRecorder.onstop = async () => {
        // Create a copy of the audio chunks and clear the original array immediately
        // This prevents recursion by ensuring we're working with a fixed set of chunks
        const currentAudioChunks = [...audioChunksRef.current];
        audioChunksRef.current = [];

        // Process the audio data if we have chunks
        if (currentAudioChunks.length > 0) {
          // Create a blob from the copied chunks
          const audioBlob = new Blob(currentAudioChunks, {
            type: "audio/webm",
          });

          try {
            // Convert to base64 and send to server
            const arrayBuffer = await audioBlob.arrayBuffer();
            const base64Audio = btoa(
              String.fromCharCode(...new Uint8Array(arrayBuffer))
            );

            if (socketRef.current) {
              socketRef.current.emit("audio-chunk", base64Audio);
            }
          } catch (error) {
            console.error("Error processing audio:", error);
            setError("Failed to process audio");
          }
        }
      };

      return true;
    } catch (error) {
      console.error("Error initializing media recorder:", error);
      setError("Microphone access denied or unavailable");
      return false;
    }
  };

  const startCall = async () => {
    try {
      setCallStatus(CallStatus.CONNECTING);
      setError(null);

      // Initialize media recorder
      const mediaInitialized = await initializeMediaRecorder();
      if (!mediaInitialized) {
        setCallStatus(CallStatus.INACTIVE);
        console.log("Media recorder initialization failed");
        return;
      }

      // Start session with voice agent
      if (socketRef.current) {
        socketRef.current.emit("start-session", {
          userId,
          userName,
          type,
          questions,
          interviewId,
          role,
          level,
          techStack,
          focus,
        });

        setCallStatus(CallStatus.ACTIVE);
        setIsRecording(true);

        // Start continuous recording
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.start(1000); // Record in 1-second chunks
        }
      }
    } catch (error) {
      console.error("Error starting call:", error);
      setError("Failed to start voice session");
      setCallStatus(CallStatus.INACTIVE);
    }
  };

  const endCall = async () => {
    try {
      // Stop speech synthesis if in progress
      if (isBrowser && window.speechSynthesis && speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }

      setCallStatus(CallStatus.FINISHED);
      setIsRecording(false);
      setIsAgentSpeaking(false);
      setIsSpeaking(false);

      // Stop recording
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }

      // Stop media stream
      if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      }

      // End session
      if (socketRef.current) {
        socketRef.current.emit("end-session");
      }
    } catch (error) {
      console.error("Error ending call:", error);
    }
  };

  const toggleRecording = () => {
    if (!mediaRecorderRef.current || callStatus !== CallStatus.ACTIVE) return;

    if (isRecording && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsRecording(false);
    } else if (!isRecording && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsRecording(true);
    }
  };

  // Function to stop speaking
  const stopSpeaking = () => {
    if (isBrowser && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsAgentSpeaking(false);
      setIsSpeaking(false);
    }
  };

  const latestMessage =
    transcript[transcript.length - 1]?.content || currentMessage;
  const isCallInactiveOrFinished =
    callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED;

  return (
    <>
      <div className="call-view">
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="Local AI agent"
              width={65}
              height={54}
              className="object-cover"
            />
            {(isSpeaking || isAgentSpeaking) && (
              <span className="animate-speak"></span>
            )}
          </div>
          <h3>AI Interviewer (Web Speech)</h3>
        </div>
        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="user avatar"
              width={540}
              height={540}
              className="rounded-full object-cover size-[120px]"
            />
            {userName}
          </div>
        </div>
      </div>

      {/* Voice Selection - Only show on client side after hydration */}
      {isBrowser && voices.length > 0 && callStatus === CallStatus.INACTIVE && (
        <div className="voice-selection mb-4 p-3 rounded-lg border">
          <label
            htmlFor="voice-select"
            className="font-medium text-sm block mb-1"
          >
            Select Voice:
          </label>
          <select
            id="voice-select"
            className="w-full p-2 border rounded"
            value={selectedVoice?.name || ""}
            onChange={(e) => {
              const selectedVoice = voices.find(
                (voice) => voice.name === e.target.value
              );
              setSelectedVoice(selectedVoice || null);
            }}
          >
            {voices
              .filter((voice) => voice.lang.includes("en"))
              .map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-border mb-4">
          <div className="error-content bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Status Display */}
      <div className="status-info mb-4 p-3 rounded-lg border">
        <div className="flex justify-between items-center text-sm">
          <span>
            <strong>Status:</strong> {callStatus}
          </span>
          <span>
            <strong>Recording:</strong> {isRecording ? "🎤 ON" : "🎤 OFF"}
          </span>
          <span>
            <strong>Messages:</strong> {transcript.length}
          </span>
        </div>
        {callStatus === CallStatus.ACTIVE && (
          <div className="mt-2 flex gap-2">
            <button
              onClick={toggleRecording}
              className={cn(
                "px-3 py-1 rounded text-xs",
                isRecording
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-green-100 text-green-700 hover:bg-green-200"
              )}
            >
              {isRecording ? "Pause" : "Resume"}
            </button>
            {isAgentSpeaking && (
              <button
                onClick={stopSpeaking}
                className="px-3 py-1 rounded text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
              >
                Stop Speaking
              </button>
            )}
          </div>
        )}
      </div>

      {/* Current Message Display */}
      {latestMessage && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              className={cn(
                "transition-opacity duration-500",
                currentMessage ? "opacity-100" : "opacity-70"
              )}
            >
              {latestMessage}
            </p>
          </div>
        </div>
      )}

      {/* Transcript History */}
      {transcript.length > 1 && (
        <div className="transcript-history mt-4 max-h-40 overflow-y-auto p-3 rounded">
          <h4 className="text-sm font-semibold mb-2">Conversation History:</h4>
          {transcript.slice(0, -1).map((msg, index) => (
            <div
              key={index}
              className={cn(
                "text-xs mb-1 p-1 rounded",
                msg.role === "user"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-green-100 text-green-800"
              )}
            >
              <strong>{msg.role === "user" ? "You" : "AI"}:</strong>{" "}
              {msg.content}
            </div>
          ))}
        </div>
      )}

      {/* Call Controls */}
      <div className="w-full flex justify-center mt-6">
        {callStatus !== CallStatus.ACTIVE ? (
          <button
            className="relative btn-call"
            onClick={startCall}
            disabled={callStatus === CallStatus.CONNECTING}
          >
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== CallStatus.CONNECTING && "hidden"
              )}
            />
            <span>
              {callStatus === CallStatus.CONNECTING
                ? "Connecting..."
                : isCallInactiveOrFinished
                ? "Start Interview"
                : "Please wait..."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={endCall}>
            End Interview
          </button>
        )}
      </div>

      {/* Debug Information - Make sure this doesn't cause hydration issues */}
      {process.env.NODE_ENV === "development" && (
        <div className="debug-panel mt-4 p-2 rounded text-xs">
          <details>
            <summary className="cursor-pointer font-semibold">
              Debug Info
            </summary>
            <div className="mt-2 space-y-1">
              <p>
                <strong>Socket Connected:</strong>{" "}
                {/* Don't check socket during SSR */}
                {isBrowser && socketRef.current?.connected ? "Yes" : "No"}
              </p>
              <p>
                <strong>Media Recorder State:</strong>{" "}
                {mediaRecorderRef.current?.state || "Not initialized"}
              </p>
              <p>
                <strong>Agent Speaking:</strong>{" "}
                {isAgentSpeaking ? "Yes" : "No"}
              </p>
              <p>
                <strong>User Recording:</strong> {isRecording ? "Yes" : "No"}
              </p>
              <p>
                <strong>Transcript Length:</strong> {transcript.length}
              </p>
              <p>
                <strong>Selected Voice:</strong>{" "}
                {selectedVoice
                  ? `${selectedVoice.name} (${selectedVoice.lang})`
                  : "Default"}
              </p>
              <p>
                <strong>Web Speech API Support:</strong>{" "}
                {/* Render the same value for server and client initially */}
                {isBrowser && window.speechSynthesis ? "Yes" : "No"}
              </p>
            </div>
          </details>
        </div>
      )}
    </>
  );
};

export default LocalVoiceAgent;
