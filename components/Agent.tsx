"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { vapi } from "@/lib/vapi.sdk";
import { useEffect } from "react";

enum CallStatus {
  INACTIVE = "INACTIVE",
  ACTIVE = "ACTIVE",
  CONNECTING = "CONNECTING",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface VapiMessage {
  type: string;
  transcriptType?: string;
  role?: "user" | "assistant" | "system";
  transcript?: string;
}

interface AgentProps {
  userName: string;
  userId: string;
  type: string;
  questions?: string[]; // Optional for interview mode
  interviewer?: any; // Optional interviewer config
  provider?: string; // Add provider option
  model?: string; // Add model option
}

const Agent = ({ 
  userName, 
  userId, 
  type, 
  questions, 
  interviewer,
  provider = "deepseek",
  model = "deepseek-v3" 
}: AgentProps) => {
  const router = useRouter();

  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [callStatus, setCallStatus] = React.useState<CallStatus>(
    CallStatus.INACTIVE
  );
  const [messages, setMessages] = React.useState<SavedMessage[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  // Debug function to check VAPI configuration
  const debugVapiConfig = () => {
    console.log("VAPI Debug Info:");
    console.log("- VAPI object:", vapi);
    console.log("- Workflow ID:", process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID);
    console.log("- VAPI methods:", Object.keys(vapi || {}));
    console.log("- User info:", { userName, userId, type });
  };

  useEffect(() => {
    // Debug VAPI configuration on component mount
    debugVapiConfig();

    const onCallStart = () => {
      console.log("Call started successfully");
      setCallStatus(CallStatus.ACTIVE);
      setError(null);
    };

    const onCallEnd = () => {
      console.log("Call ended");
      setCallStatus(CallStatus.FINISHED);
    };

    const onMessage = (message: VapiMessage) => {
      console.log("Received message:", message);
      try {
        if (
          message.type === "transcript" &&
          message.transcriptType === "final" &&
          message.role &&
          message.transcript
        ) {
          const newMessage = {
            role: message.role,
            content: message.transcript,
          };

          setMessages((prev) => [...prev, newMessage]);
        }
      } catch (err) {
        console.error("Error processing message:", err);
        setError(`Message processing error: ${err}`);
      }
    };

    const onSpeechStart = () => {
      console.log("Speech started");
      setIsSpeaking(true);
    };

    const onSpeechEnd = () => {
      console.log("Speech ended");
      setIsSpeaking(false);
    };

    const onError = (error: any) => {
      console.error("VAPI Error Details:");
      console.error("- Error object:", error);
      console.error("- Error type:", typeof error);
      console.error("- Error keys:", Object.keys(error || {}));
      console.error("- Error message:", error?.message || "No message");
      console.error("- Error stack:", error?.stack || "No stack");
      
      // Handle VAPI specific error format
      let errorMessage = "Unknown error occurred";
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // Handle VAPI error format with data/error keys
        if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.data && error.data.message) {
          errorMessage = error.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.statusCode) {
          errorMessage = `API Error (${error.statusCode})`;
          
          // Common VAPI status codes
          switch (error.statusCode) {
            case 401:
              errorMessage += ": Invalid API key or unauthorized access";
              break;
            case 400:
              errorMessage += ": Bad request - check your workflow ID and parameters";
              break;
            case 404:
              errorMessage += ": Workflow not found - check your workflow ID";
              break;
            case 500:
              errorMessage += ": Server error - please try again later";
              break;
          }
        } else {
          errorMessage = JSON.stringify(error);
        }
      }

      setError(errorMessage);
      setCallStatus(CallStatus.INACTIVE);
    };

    // Check if VAPI is properly initialized before setting up listeners
    if (!vapi) {
      console.error("VAPI is not initialized");
      setError("VAPI SDK not initialized");
      return;
    }

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, []);

  useEffect(() => {
    if (callStatus === CallStatus.FINISHED) {
      router.push("/");
    }
  }, [messages, callStatus, type, userId, router]);

  const handleCall = async () => {
    try {
      setCallStatus(CallStatus.CONNECTING);
      setError(null);

      console.log("Starting call with config:");
      console.log("- Type:", type);
      console.log("- Workflow ID:", process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID);
      console.log("- Variables:", { username: userName, userid: userId });
      console.log("- Provider:", provider);
      console.log("- Model:", model);

      // Validate VAPI SDK
      if (!vapi) {
        throw new Error("VAPI SDK is not initialized");
      }

      if (typeof vapi.start !== "function") {
        throw new Error("VAPI SDK start method is not available");
      }

      // Validate user data
      if (!userName || !userId) {
        throw new Error("Username and userId are required");
      }

      if (type === "generate") {
        // Validate environment variables for workflow
        if (!process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID) {
          throw new Error("NEXT_PUBLIC_VAPI_WORKFLOW_ID is not defined in environment variables");
        }

        // Use workflow mode - explicitly pass undefined for assistant
        const result = await vapi.start(
          undefined, // assistant - explicitly undefined
          undefined, // assistantOverrides
          undefined, // serverUrl
          process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID, // workflowId
          {
            variableValues: {
              username: userName,
              userid: userId,
            }
          }
        );

        console.log("VAPI start result (workflow mode):", result);
      } else {
        // Use assistant mode with questions
        let formattedQuestions = "";
        if (questions) {
          formattedQuestions = questions
            .map((question) => `- ${question}`)
            .join("\n");
        }

        if (!interviewer) {
          throw new Error("Interviewer configuration is required for non-generate mode");
        }

        const result = await vapi.start(interviewer, {
          variableValues: {
            questions: formattedQuestions,
          }
        });

        console.log("VAPI start result (assistant mode):", result);
      }

    } catch (error: any) {
      console.error("Failed to start call - detailed error:");
      console.error("- Error:", error);
      console.error("- Error message:", error?.message);
      console.error("- Error stack:", error?.stack);
      
      const errorMessage = error?.message || error?.toString() || "Unknown error starting call";
      setError(errorMessage);
      setCallStatus(CallStatus.INACTIVE);
    }
  };

  const handleDisconnect = async () => {
    try {
      console.log("Disconnecting call");
      setCallStatus(CallStatus.FINISHED);
      
      if (vapi && typeof vapi.stop === "function") {
        vapi.stop();
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
    }
  };

  const latestMessage = messages[messages.length - 1]?.content;
  const isCallInactiveOrFinished =
    callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED;

  return (
    <>
      <div className="call-view">
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="vapi agent"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak"></span>}
          </div>
          <h3>AI Interviewer</h3>
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

      {/* Error Display */}
      {error && (
        <div className="error-border mb-4">
          <div className="error-content bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Call Status Debug Info */}
      <div className="debug-info mb-4 p-2 bg-gray-100 rounded text-sm">
        <p><strong>Call Status:</strong> {callStatus}</p>
        <p><strong>Messages Count:</strong> {messages.length}</p>
        <p><strong>Is Speaking:</strong> {isSpeaking ? 'Yes' : 'No'}</p>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={latestMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {latestMessage}
            </p>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== "ACTIVE" ? (
          <button className="relative btn-call" onClick={handleCall}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />
            <span>{isCallInactiveOrFinished ? "Call" : " . . ."}</span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={handleDisconnect}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;