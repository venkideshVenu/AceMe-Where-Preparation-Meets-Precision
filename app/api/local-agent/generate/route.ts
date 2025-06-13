// app/api/local-agent/generate/route.ts
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

// Alternative: Use Ollama directly instead of Google AI
async function generateWithOllama(prompt: string) {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.1',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          max_tokens: 1000
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error with Ollama:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  const { type, role, level, techstack, amount, userid, useLocalAgent = false } = await request.json();

  try {
    let questions: string;

    const prompt = `Prepare questions for a job interview.
      The job role is ${role}.
      The job experience level is ${level}.
      The tech stack used in the job is: ${techstack}.
      The focus between behavioural and technical questions should lean towards: ${type}.
      The amount of questions required is: ${amount}.
      Please return only the questions, without any additional text.
      The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
      Return the questions formatted like this:
      ["Question 1", "Question 2", "Question 3"]
      
      Thank you! <3
    `;

    if (useLocalAgent) {
      // Use local Ollama for question generation
      questions = await generateWithOllama(prompt);
    } else {
      // Use existing Google AI
      const { text } = await generateText({
        model: google("gemini-2.0-flash-001"),
        prompt: prompt,
      });
      questions = text;
    }

    const interview = {
      role: role,
      type: type,
      level: level,
      techstack: techstack.split(","),
      questions: JSON.parse(questions),
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
      voiceAgent: useLocalAgent ? 'local' : 'vapi', // Track which agent was used
    };

    const docRef = await db.collection("interviews").add(interview);

    return Response.json({ 
      success: true, 
      interviewId: docRef.id,
      agentType: useLocalAgent ? 'local' : 'vapi'
    }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ 
    success: true, 
    data: "Local Agent API is running",
    services: {
      ollama: await checkOllamaHealth(),
      voiceAgent: await checkVoiceAgentHealth()
    }
  }, { status: 200 });
}

async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    return response.ok;
  } catch {
    return false;
  }
}

async function checkVoiceAgentHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8080/health');
    const data = await response.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}