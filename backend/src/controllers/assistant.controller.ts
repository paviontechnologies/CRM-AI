import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { runAssistant, ChatMessage } from '../services/assistant.service';
import type { AppContext } from '../types';

const ChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000)
      })
    )
    .min(1)
    .max(40)
});

export const chat = async (c: AppContext) => {
  const { orgId, userId, role } = c.get('user');
  const { messages } = ChatSchema.parse(await c.req.json());

  // Last turn must be from the user.
  if (messages[messages.length - 1].role !== 'user') {
    return c.json({ error: 'The last message must be from the user.' }, 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  const userName = user?.name || user?.email?.split('@')[0] || 'there';

  const result = await runAssistant(messages as ChatMessage[], { orgId, userId, role }, userName);

  // Log usage only when the model actually did work (took an action or replied).
  if (result.actions.length > 0) {
    await prisma.usageLog
      .create({
        data: {
          organizationId: orgId,
          type: 'ai_credit',
          amount: 1,
          metadata: JSON.stringify({ action: 'assistant', tools: result.actions.map((a) => a.tool) })
        }
      })
      .catch(() => undefined);
  }

  return c.json(result);
};
