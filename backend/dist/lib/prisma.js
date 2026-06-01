"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const adapter_libsql_1 = require("@prisma/adapter-libsql");
const path_1 = __importDefault(require("path"));
const globalForPrisma = global;
function createPrismaClient() {
    const dbUrl = process.env.DATABASE_URL ||
        `file:${path_1.default.join(__dirname, '../../../../packages/database/prisma/dev.db')}`;
    const adapter = new adapter_libsql_1.PrismaLibSql({ url: dbUrl });
    return new client_1.PrismaClient({ adapter, log: ['error'] });
}
exports.prisma = globalForPrisma.prisma || createPrismaClient();
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
