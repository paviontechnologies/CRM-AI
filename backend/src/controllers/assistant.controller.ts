import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { runAssistant, ChatMessage } from '../services/assistant.service';

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

export const chat = async (req: AuthRequest, res: Response) => {
  try {
    const { orgId, userId, role } = req.user!;
    const { messages } = ChatSchema.parse(req.body);

    // Last turn must be from the user.
    if (messages[messages.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'The last message must be from the user.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    const userName = user?.name || user?.email?.split('@')[0] || 'there';

    const result = await runAssistant(messages as ChatMessage[], { orgId, userId, role }, userName);

    // Log usage only when the model actually did work (took an action or replied).
    if (result.actions.length > 0) {
      await prisma.usageLog.create({
        data: {
          organizationId: orgId,
          type: 'ai_credit',
          amount: 1,
          metadata: JSON.stringify({ action: 'assistant', tools: result.actions.map((a) => a.tool) })
        }
      }).catch(() => undefined);
    }

    res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Assistant chat error:', error);
    res.status(500).json({ error: 'The assistant hit an error. Please try again.' });
  }
};
