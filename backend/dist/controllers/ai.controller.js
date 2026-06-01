"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreLead = void 0;
const prisma_1 = require("../lib/prisma");
const ai_service_1 = require("../services/ai.service");
const scoreLead = async (req, res) => {
    try {
        const { leadId } = req.params;
        const orgId = req.user.orgId;
        const lead = await prisma_1.prisma.lead.findFirst({
            where: { id: leadId, organizationId: orgId }
        });
        if (!lead) {
            return res.status(404).json({ error: "Lead not found" });
        }
        const aiAnalysis = await (0, ai_service_1.scoreLeadIntent)({
            companyName: lead.companyName,
            industry: lead.industry,
            city: lead.city,
            source: lead.source
        });
        const updatedLead = await prisma_1.prisma.lead.update({
            where: { id: leadId },
            data: { intentScore: aiAnalysis.intentScore }
        });
        await prisma_1.prisma.leadScore.create({
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
    }
    catch (error) {
        console.error("Score Lead API Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};
exports.scoreLead = scoreLead;
