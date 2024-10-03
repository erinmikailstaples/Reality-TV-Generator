import { NextResponse } from "next/server";
import Replicate from "replicate";
import arcjet, { tokenBucket } from "@arcjet/next";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export const dynamic = 'force-dynamic';

const aj = arcjet({
  key: process.env.ARCJET_KEY || "",
  characteristics: ["userId"],
  rules: [
    tokenBucket({
      mode: "LIVE",
      refillRate: 10,
      interval: 3600,
      capacity: 10,
    }),
  ],
});

export async function POST(req) {
  try {
    const { celebrity, environment, promptConfig, userId, isDirector } = await req.json();

    if (!isDirector) {
      const result = await aj.protect(req, {
        userId: userId,
      });

      if (!result.allow) {
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
      }
    }

    console.log("Received request with:", { celebrity, environment, promptConfig, userId, isDirector });
  
    const prompt = promptConfig?.prompt 
      ? promptConfig.prompt.replace('{celebrity}', celebrity).replace('{environment}', environment)
      : `Generate a survival scenario in 500 characters or less for ${celebrity} in ${environment}.`;
  
    console.log("Generated prompt:", prompt);

    const output = await replicate.run(
      promptConfig?.model || "replicate/llama-2-70b-chat:2c1608e18606fad2812020dc541930f2d0495ce32eee50074220b87300bc16e1",
      { input: { prompt } }
    );

    console.log("AI output:", output);

    return NextResponse.json({ scenario: output.join("") });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}