import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { dummyInterviews } from "@/constants";
import InterviewCard from "@/components/InterviewCard";
import {
  getCurrentUser,
  getInterviewsByUserId,
  getLatestInterviews,
} from "@/lib/actions/auth.action";

const page = async () => {
  const user = await getCurrentUser();
  const [userInterviews,latestInterviews] = await Promise.all([
    await getInterviewsByUserId(user?.id!),await getLatestInterviews({userId : user?.id!}),
  ])


  const hasPastInterviews = userInterviews && userInterviews.length > 0;
  const hasUpcomingInterviews = latestInterviews && latestInterviews.length > 0;


  return (
    <>
      <section className="cart-cta flex justify-between items-center gap-8 w-full">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>Get Interview-Ready with AI-Powered Practice & FeedBack</h2>
          <p className="text-lg">
            Practice on real Interview Questions with AI-Powered Feedback.
          </p>
          <Button asChild className="btn-primary max-sm:w-full">
            <Link href="/interview">Start an Interview</Link>
          </Button>
        </div>
        <div className="flex-shrink-0">
          <Image
            src="/robot.png"
            alt="robot"
            width={400}
            height={400}
            className="max-sm:hidden object-contain"
          />
        </div>
      </section>

      <section className="flex flex-col gap-6 mt-8">
        <h2>Your Interviews</h2>
        <div className="interviews-section">
          {hasPastInterviews ? (
            userInterviews.map((interview) => (
              <InterviewCard {...interview} key={interview.id} />
            ))
          ) : (
            <p>You haven't taken any interviews yet</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-6 mt-8">
        <h2>Take an Interview</h2>
        <div className="interviews-section">
          {hasUpcomingInterviews ? (
            latestInterviews.map((interview) => (
              <InterviewCard {...interview} key={interview.id} />
            ))
          ) : (
            <p>There are no new interviews upcoming...</p>
          )}
        </div>
      </section>
    </>
  );
};

export default page;
