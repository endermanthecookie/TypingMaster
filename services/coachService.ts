
import { AIProvider } from "../types";
import { fetchCoachNote as fetchGeminiNote } from "./geminiService";
import { fetchGithubCoachNote } from "./githubService";

export const getCoachReport = async (
  provider: AIProvider,
  token: string,
  wpm: number,
  accuracy: number,
  errors: number,
  missedChars: string[]
): Promise<string> => {
  if (provider === AIProvider.GITHUB && token) {
    try {
      return await fetchGithubCoachNote(wpm, accuracy, errors, missedChars, token);
    } catch (e) {
      console.error("GitHub Coach failed, falling back to Gemini", e);
    }
  }
  return await fetchGeminiNote(wpm, accuracy, errors, missedChars);
};
