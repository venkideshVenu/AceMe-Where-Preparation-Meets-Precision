import Agent from "@/components/Agent";
import { getCurrentUser, getInterviewsByUserId } from "@/lib/actions/auth.action";
import EnvCheck from "@/components/EnvCheck";
import React from "react";

const page = async () => {
  try {
    const user = await getCurrentUser();

    // Handle case where user is null
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h3>Authentication Required</h3>
          <p>Please log in to access the interview generation.</p>
        </div>
      );
    }

    // Ensure user.name and user.id are strings
    const userName =
      typeof user.name === "string"
        ? user.name
        : typeof user.name === "object"
        ? JSON.stringify(user.name)
        : String(user.name || "Unknown User");

    const userId =
      typeof user.id === "string"
        ? user.id
        : typeof user.id === "object"
        ? JSON.stringify(user.id)
        : String(user.id || "unknown-id");

    console.log("Processed userName:", userName);
    console.log("Processed userId:", userId);

    return (
      <>
        <h3>Interview Generation</h3>
        <EnvCheck />
        <Agent userName={userName} userId={userId} type="generate" />
      </>
    );
  } catch (error) {
    console.error("Error in page component:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h3>Error Loading Page</h3>
        <p>There was an error loading the interview page. Please try again.</p>
        <pre className="mt-4 p-4 bg-gray-100 rounded text-sm">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      </div>
    );
  }
};

export default page;
