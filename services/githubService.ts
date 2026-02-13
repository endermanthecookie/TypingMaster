
import { Difficulty } from "../types";

export const fetchGithubTypingText = async (
  difficulty: Difficulty, 
  category: string, 
  token: string
): Promise<string> => {
  const theme = category === "General" 
    ? "fascinating trivia, general knowledge, science facts, or life philosophy" 
    : category;

  const prompt = `Generate a single ${difficulty} level typing practice sentence about "${theme}". 
  - Easy: Short, simple words, no complex punctuation. (10-15 words)
  - Medium: Moderate length, some common punctuation. (20-30 words)
  - Hard: Longer, complex vocabulary, advanced punctuation, and technical terms. (40-60 words)
  Return ONLY the sentence text, no quotes, no labels, and no surrounding whitespace.`;

  try {
    const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a helpful assistant providing typing practice sentences." },
          { role: "user", content: prompt }
        ],
        model: "gpt-4o-mini",
        temperature: 1,
        max_tokens: 150,
        top_p: 1
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "GitHub API Error");
    }

    const data = await response.json();
    return data.choices[0].message.content.trim() || "Technology and curiosity drive human progress across all fields of study.";
  } catch (error) {
    console.error("Failed to fetch GitHub Model text:", error);
    throw error;
  }
};

export const fetchGithubCoachNote = async (
  wpm: number,
  accuracy: number,
  errors: number,
  missedChars: string[],
  token: string
): Promise<string> => {
  const prompt = `Act as a world-class typing coach. Analyze these stats: 
  WPM: ${wpm}, Accuracy: ${accuracy}%, Total Errors: ${errors}. 
  Frequently missed characters: ${missedChars.join(', ')}.
  Provide a single, insightful, motivating sentence of feedback (max 20 words).`;

  try {
    const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a motivating typing coach." },
          { role: "user", content: prompt }
        ],
        model: "gpt-4o-mini",
        temperature: 0.8,
        max_tokens: 100
      })
    });
    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch {
    return "Keep pushing. Your potential is limitless.";
  }
};
