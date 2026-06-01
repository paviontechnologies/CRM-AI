import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { scoreLeadIntent } from '../services/ai.service';

export const scoreLead = async (req: AuthRequest, res: Response) => {
    try {
        const { leadId } = req.params;
        const orgId = req.user!.orgId;

        const lead = await prisma.lead.findFirst({
            where: { id: leadId, organizationId: orgId }
        });

        if (!lead) {
            return res.status(404).json({ error: "Lead not found" });
        }

        const aiAnalysis = await scoreLeadIntent({
            companyName: lead.companyName,
            industry: lead.industry,
            city: lead.city,
            source: lead.source
        });

        const updatedLead = await prisma.lead.update({
            where: { id: leadId },
            data: { intentScore: aiAnalysis.intentScore }
        });

        await prisma.leadScore.create({
            data: {
                leadId: lead.id,
                score: aiAnalysis.intentScore,
                reasons: aiAnalysis.reasons.join(' | ')
            }
        });

        res.status(200).json({
            lead: updatedLead,
            analysis: aiAnalysis
        });

    } catch (error) {
        console.error("Score Lead API Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};
