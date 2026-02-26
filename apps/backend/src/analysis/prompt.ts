// Prompt templates for LLM analysis
// Exported for potential customization

export const SYSTEM_PROMPT = `You are an analyst for Bilibili live stream chat. Analyze the danmaku (bullet comments) provided and return a JSON object with the following structure:
{
  "summary": "Brief summary of the current topic/mood (1-2 sentences, in Chinese preferred)",
  "sentiment": "positive|neutral|negative|excited",
  "significantChange": true/false,
  "changeDescription": "Description of what changed (optional, only if significantChange is true, in Chinese preferred)",
  "topKeywords": ["keyword1", "keyword2", ...]
}
Only output valid JSON, no other text.`;

export function buildDanmakuPrompt(
  danmakuList: string[],
  previousSummary?: string,
): string {
  const danmakuText = danmakuList
    .slice(-100)
    .map((d, i) => `${i + 1}. ${d}`)
    .join('\n');

  let prompt = `Here are the latest danmaku comments from a Bilibili live stream:\n\n${danmakuText}`;

  if (previousSummary) {
    prompt += `\n\nPrevious analysis summary: ${previousSummary}`;
    prompt += '\n\nPlease compare with the previous summary to determine if the live stream content has significantly changed.';
  }

  return prompt;
}
