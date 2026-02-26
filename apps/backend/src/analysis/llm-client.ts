import axios from 'axios';
import { config } from '../config/index.js';
import type { LlmAnalysisEvent } from '@bilibili-monitor/shared';

interface LlmAnalysisResult {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'excited';
  significantChange: boolean;
  changeDescription?: string;
  topKeywords: string[];
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function analyzeDanmaku(
  danmakuList: string[],
  previousSummary?: string,
): Promise<LlmAnalysisResult> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an analyst for Bilibili live stream chat. Analyze the danmaku (bullet comments) provided and return a JSON object with the following structure:
{
  "summary": "Brief summary of the current topic/mood (1-2 sentences, in Chinese)",
  "sentiment": "positive|neutral|negative|excited",
  "significantChange": true/false,
  "changeDescription": "Description of what changed (optional, only if significantChange is true)",
  "topKeywords": ["keyword1", "keyword2", ...]
}
Only output valid JSON, no other text.`,
    },
    {
      role: 'user',
      content: buildPrompt(danmakuList, previousSummary),
    },
  ];

  const response = await axios.post<ChatCompletionResponse>(
    `${config.LLM_BASE_URL}/chat/completions`,
    {
      model: config.LLM_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 512,
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        Authorization: `Bearer ${config.LLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    },
  );

  const content = response.data.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content) as LlmAnalysisResult;

  return {
    summary: parsed.summary ?? '',
    sentiment: parsed.sentiment ?? 'neutral',
    significantChange: parsed.significantChange ?? false,
    changeDescription: parsed.changeDescription,
    topKeywords: Array.isArray(parsed.topKeywords) ? parsed.topKeywords.slice(0, 10) : [],
  };
}

function buildPrompt(danmakuList: string[], previousSummary?: string): string {
  const danmakuText = danmakuList
    .slice(-100)
    .map((d, i) => `${i + 1}. ${d}`)
    .join('\n');

  let prompt = `Here are the latest danmaku comments from a Bilibili live stream:\n\n${danmakuText}`;

  if (previousSummary) {
    prompt += `\n\nPrevious analysis summary: ${previousSummary}`;
    prompt += '\n\nCompare with previous summary to determine if there is a significant change.';
  }

  return prompt;
}
