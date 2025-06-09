import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

enum CallStatus {
  INACTIVE = "INACTIVE",
  ACTIVE = "ACTIVE",
  CONNECTING = "CONNECTING",
  FINISHED = "FINISHED",
}

const Agent = ({ userName }: AgentProps) => {
  const isSpeaking = true;
  const callStatus = CallStatus.FINISHED; 
  const messages = [
    'Whats your name?',
    'What is your favorite programming language?',
    'What is your favorite framework?',
    'What is your favorite database?',
    'What is your favorite cloud provider?',
    
  ];

  const lastMessage = messages[messages.length - 1];

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

      {messages.length > 0 && (
        <div className="transcript-border">
            <div className="transcript">
                <p key={lastMessage} className={cn('transisiton-opacity duration-500 opacity-0', 'animate-fadeIn opacity-100')}>
                    {lastMessage}
                </p>
            </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== "ACTIVE" ? (
          <button className="relative btn-call">
            <span className={cn('absolute animate-ping rounded-full opacity-75', callStatus !== 'CONNECTING' && 'hidden')}
              />
            
            <span>
                {callStatus === "INACTIVE" || callStatus === "FINISHED"
                ? "Call"
                : " . . ."} 

            </span>
          </button>
        ) : (
          <button className="btn-disconnect">End</button>
        )}
      </div>
    </>
  );
};

export default Agent;
