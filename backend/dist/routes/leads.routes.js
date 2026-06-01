"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leads_controller_1 = require("../controllers/leads.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', leads_controller_1.getLeads);
router.post('/import', leads_controller_1.importLeads);
router.post('/generate', leads_controller_1.generateLeadsAI); // AI lead generator
router.get('/:id', leads_controller_1.getLead);
router.post('/', leads_controller_1.createLead);
router.put('/:id', leads_controller_1.updateLead);
router.delete('/:id', leads_controller_1.deleteLead);
router.patch('/:id/status', leads_controller_1.updateLeadStatus);
router.post('/:id/score', leads_controller_1.scoreLeadAI);
router.post('/:id/outreach', leads_controller_1.generateOutreach);
exports.default = router;
