import Anthropic from '@anthropic-ai/sdk';
import { toolDefinitions, executeTool, ToolContext } from './assistant.tools';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
const HAS_KEY = !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 10);
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TURNS = 6; // hard cap on tool-call rounds per request

const systemPrompt = (userName: string) => `You are the AI assistant inside a B2B sales CRM. You help ${userName} manage leads, deals, tasks and outreach by answering questions AND taking actions on their behalf using the tools provided.

Guidelines:
- When the user asks you to do something (create a lead, score a lead, add a task, move a deal, etc.), use the appropriate tool. Do not just describe how — actually do it.
- To act on a specific lead or deal the user names, you can pass the company/deal name; the tools resolve it. If a name is ambiguous or missing, ask a brief clarifying question instead of guessing.
- Chain tools when needed: e.g. to "score the Apollo lead and add a follow-up task", call score_lead then create_task.
- Be concise. After acting, confirm what you did in one or two sentences. Use plain language, not JSON.
- Never invent data. If a tool returns nothing, say so.
- All data is scoped to the user's organization automatically. Never mention internal ids unless asked.
- Amounts are in the organization's currency (assume INR / ₹ unless told otherwise).`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantAction {
  tool: string;
  ok: boolean;
  summary: string;
  link?: string;
}

export interface AssistantReply {
  reply: string;
  actions: AssistantAction[];
}

/**
 * Runs one assistant turn: feeds the conversation to Claude, executes any tool
 * calls it makes (org-scoped), and returns the final natural-language reply plus
 * a list of the concrete actions taken for the UI to surface.
 */
export const runAssistant = async (
  history: ChatMessage[],
  ctx: ToolContext,
  userName: string
): Promise<AssistantReply> => {
  if (!HAS_KEY) {
    return {
      reply:
        "The AI assistant isn't configured yet — set ANTHROPIC_API_KEY on the server to enable it. Once it's set, I can search leads, score them, draft outreach, create tasks and deals, and more, just by asking.",
      actions: []
    };
  }

  // Only keep the recent window; the tool results carry the live data anyway.
  const trimmed = history.slice(-12);
  const messages: Anthropic.MessageParam[] = trimmed.map((m) => ({ role: m.role, content: m.content }));

  const actions: AssistantAction[] = [];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: systemPrompt(userName),
      tools: toolDefinitions as any,
      messages
    });

    if (response.stop_reason === 'tool_use') {
      // Preserve the assistant's turn (text + tool_use blocks) verbatim.
      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        const result = await executeTool(block.name, block.input, ctx);
        actions.push({ tool: block.name, ok: result.ok, summary: result.summary, link: result.link });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          // The model reads this to compose its reply and decide next steps.
          content: JSON.stringify({ ok: result.ok, summary: result.summary, data: result.data ?? null }),
          is_error: !result.ok
        });
      }

      messages.push({ role: 'user', content: toolResults });
      continue; // let the model react to the tool results
    }

    // Final answer — collect the text blocks.
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    return { reply: text || 'Done.', actions };
  }

  // Ran out of turns while still calling tools — return what we accomplished.
  return {
    reply: "I've done what I could, but the request needed more steps than I can take at once. Anything specific you'd like me to finish?",
    actions
  };
};
