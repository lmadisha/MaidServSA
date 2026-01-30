import { GoogleGenAI } from '@google/genai';

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

export const generateJobDescription = async (
  rooms: number,
  bathrooms: number,
  areaSize: number,
  location: string,
  requirements: string
): Promise<string> => {
  const client = getAiClient();
  if (!client) return 'API Key missing. Please provide a description manually.';

  try {
    const prompt = `
      Write a professional and attractive job description for a house cleaning service on MaidServSA.
      Details:
      - Location: ${location}
      - Size: ${areaSize} square meters
      - Configuration: ${rooms} bedrooms, ${bathrooms} bathrooms.
      - Specific Requirements: ${requirements}
      
      Keep it concise (under 100 words), inviting for professional cleaners, and emphasize the fair competitive rate.
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
