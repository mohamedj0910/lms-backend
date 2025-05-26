"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataSource = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const typeorm_1 = require("typeorm");
const users_1 = require("../entity/users/users");
const leaveRequests_1 = require("../entity/leaveRequests/leaveRequests");
const leaveDetail_1 = require("../entity/leaveDetails/leaveDetail");
const approvals_1 = require("../entity/approvals/approvals");
const leaveType_1 = require("../entity/leaveTypes/leaveType");
const isSSL = process.env.SSL_MODE === 'REQUIRED';
const dataSource = new typeorm_1.DataSource({
    type: "mysql",
    host: process.env.HOST,
    username: process.env.USER_NAME,
    password: process.env.PASSWORD,
    port: parseInt(process.env.PORT1),
    database: process.env.DATABASE,
    ssl: isSSL ? { rejectUnauthorized: false } : undefined,
    entities: [users_1.Employee, leaveRequests_1.LeaveRequest, leaveDetail_1.LeaveDetail, approvals_1.Approval, leaveType_1.LeaveType],
    synchronize: true,
});
exports.dataSource = dataSource;
dataSource.initialize()
    .then(() => {
    console.log("✅ Database connection established");
})
    .catch((err) => {
    console.error("❌ Database connection error:", err);
});
