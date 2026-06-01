"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const leads_routes_1 = __importDefault(require("./routes/leads.routes"));
const campaigns_routes_1 = __importDefault(require("./routes/campaigns.routes"));
const pipeline_routes_1 = __importDefault(require("./routes/pipeline.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const billing_routes_1 = __importDefault(require("./routes/billing.routes"));
const team_routes_1 = __importDefault(require("./routes/team.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json({ limit: '10mb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ai-leadgen-api', version: '2.0.0' }));
app.use('/api/auth', auth_routes_1.default);
app.use('/api/leads', leads_routes_1.default);
app.use('/api/campaigns', campaigns_routes_1.default);
app.use('/api/pipeline', pipeline_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/billing', billing_routes_1.default);
app.use('/api/team', team_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
