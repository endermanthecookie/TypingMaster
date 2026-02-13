
import { GoogleGenAI } from "@google/genai";
import { Difficulty } from "../types";

export const fetchTypingText = async (difficulty: Difficulty, category: string = "General", seed?: string): Promise<string> => {
  const theme = category === "General" 
    ? "fascinating trivia, general knowledge, science facts, or life philosophy" 
    : category;

  const prompt = `Generate a single ${difficulty} level typing practice sentence about "${theme}". 
  ${seed ? `Base the content loosely on the concept of: ${seed}.` : ''}
  - Easy: Short, simple words, no complex punctuation. (10-15 words)
  - Medium: Moderate length, some common punctuation. (20-30 words)
  - Hard: Longer, complex vocabulary, advanced punctuation, and technical terms. (40-60 words)
  Return ONLY the sentence text, no quotes, no labels, and no surrounding whitespace.`;

  try {
    // Create a new instance right before the call to pick up the current API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text?.trim() || "Technology and curiosity drive human progress across all fields of study.";
  } catch (error) {
    console.error("Failed to fetch AI text:", error);
    return "The quick brown fox jumps over the lazy dog in a display of classic typing practice.";
  }
};

export const fetchCoachNote = async (wpm: number, accuracy: number, errors: number, missedChars: string[]): Promise<string> => {
  const prompt = `Act as a world-class typing coach. Analyze these stats: 
  WPM: ${wpm}, Accuracy: ${accuracy}%, Total Errors: ${errors}. 
  Frequently missed characters: ${missedChars.join(', ')}.
  Provide a single, insightful, motivating sentence of feedback (max 20 words).`;

  try {
    // Create a new instance right before the call to pick up the current API key
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
