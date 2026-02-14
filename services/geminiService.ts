
import { GoogleGenAI } from "@google/genai";
import { Difficulty } from "../types";

export const fetchTypingText = async (
  difficulty: Difficulty, 
  category: string = "General", 
  seed?: string,
  problemKeys: string[] = []
): Promise<string> => {
  const drillContext = problemKeys.length > 0 
    ? `IMPORTANT: This is a neuro-adaptive drill. The user is struggling with these keys: [${problemKeys.join(', ')}]. 
       Ensure the generated text contains an abnormally high frequency of these specific characters to help them practice.`
    : "";

  const theme = category !== "General" ? category : "fascinating trivia or life philosophy";

  const prompt = `Generate a single ${difficulty} level typing practice sentence about "${theme}". 
  ${seed ? `Base the content loosely on: ${seed}.` : ''}
  ${drillContext}
  
  Constraints:
  - Easy: Short, simple words, no complex punctuation. (10-15 words)
  - Medium: Moderate length, some common punctuation. (20-30 words)
  - Hard: Longer, complex vocabulary, advanced punctuation. (40-60 words)
  - Return ONLY the sentence text. No quotes. No extra labels.`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    if (!response || !response.text) {
      throw new Error("Empty response from Gemini Core.");
    }
    
    return response.text.trim();
  } catch (error) {
    console.error("Gemini Core Error:", error);
    throw error;
  }
};

export const fetchCoachNote = async (wpm: number, accuracy: number, errors: number, missedChars: string[]): Promise<string> => {
  const prompt = `Act as a world-class typing coach. Analyze these stats: 
  WPM: ${wpm}, Accuracy: ${accuracy}%, Total Errors: ${errors}. 
  Frequently missed characters: ${missedChars.join(', ')}.
  Provide a single, insightful, motivating sentence of feedback (max 20 words).`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text?.trim() || "Great run! Focus on maintaining rhythm during difficult transitions.";
  } catch {
    return "Solid effort. Consistency is the key to unlocking true speed.";
  }
};
