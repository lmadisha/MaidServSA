import { GoogleGenAI } from '@google/genai';
import { Job, User } from '../types';

// Create the client lazily so the app doesn't crash when no API key is configured.
let ai: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = (process.env as any)?.GEMINI_API_KEY as string | '';
  if (!apiKey) return null;

  if (!ai) {
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

interface JobDescriptionContext {
  client?: Partial<User>;
  maidRatingSummary?: string;
}

export const generateJobDescription = async (
  rooms: number,
  bathrooms: number,
  areaSize: number,
  location: string,
  requirements: string,
  context?: JobDescriptionContext
): Promise<string> => {
  const client = getAiClient();
  if (!client) return 'API Key missing. Please provide a description manually.';

  try {
    const clientContext = context?.client
      ? `\nClient context:\n- Name: ${context.client.name || 'N/A'}\n- Bio: ${context.client.bio || 'N/A'}\n- Location: ${context.client.location || 'N/A'}`
      : '';

    const ratingsContext = context?.maidRatingSummary
      ? `\nMaid rating insights:\n- ${context.maidRatingSummary}`
      : '';

    const prompt = `
      Write a professional and attractive job description for a house cleaning service on MaidServSA.
      Details:
      - Public Area: ${location}
      - Size: ${areaSize} square meters
      - Configuration: ${rooms} bedrooms, ${bathrooms} bathrooms.
      - Specific Requirements: ${requirements}
      ${clientContext}
      ${ratingsContext}
      Keep it concise (under 120 words), inviting for professional cleaners, and emphasize a fair competitive rate.
      Return plain text only.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || 'Could not generate description.';
  } catch (error) {
    console.error('Error generating description:', error);
    return 'Failed to generate description due to an error.';
  }
};

export const generateApplicationMessage = async (
  job: Pick<
    Job,
    'title' | 'description' | 'publicArea' | 'location' | 'rooms' | 'bathrooms' | 'areaSize'
  >,
  maid: Pick<User, 'name' | 'bio' | 'experienceAnswers' | 'cvFileName' | 'rating' | 'ratingCount'>
): Promise<string> => {
  const client = getAiClient();
  if (!client) return 'Hi, I am interested in your cleaning job and would love to help.';

  try {
    const experienceSummary =
      maid.experienceAnswers?.map((a) => `${a.question}: ${a.answer}`).join('\n') || 'N/A';

    const prompt = `
      Write a professional but friendly application message for a maid applying to a cleaning job.

      Job details:
      - Title: ${job.title}
      - Description: ${job.description}
      - Area: ${job.publicArea || job.location}
      - Bedrooms/Bathrooms: ${job.rooms}/${job.bathrooms}
      - Area size: ${job.areaSize} sqm

      Maid profile:
      - Name: ${maid.name}
      - Bio: ${maid.bio || 'N/A'}
      - Rating: ${maid.rating ?? 0} (${maid.ratingCount ?? 0} reviews)
      - Experience answers:
      ${experienceSummary}
      - CV file reference: ${maid.cvFileName || 'No CV file uploaded'}

      Requirements:
      - Keep it under 120 words.
      - Sound confident and trustworthy.
      - Mention relevant experience and reliability.
      - Invite the client to discuss details.
      - Return plain text only.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || 'Hi, I am interested in your cleaning job and would love to help.';
  } catch (error) {
    console.error('Error generating application message:', error);
    return 'Hi, I am interested in your cleaning job and would love to help.';
  }
};

export const analyzeCandidateMatch = async (
  jobDescription: string,
  candidateBio: string
): Promise<string> => {
  const client = getAiClient();
  if (!client) return 'Match analysis unavailable.';

  try {
    const prompt = `
      Analyze the fit between this cleaning job and the candidate.
      Job: "${jobDescription}"
      Candidate Bio: "${candidateBio}"
      
      Give a 1-sentence assessment of why they might be a good fit.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || 'Analysis unavailable.';
  } catch (error) {
    console.error('Error analyzing match:', error);
    return 'Analysis failed.';
  }
};
