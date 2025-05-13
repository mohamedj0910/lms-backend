"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approvalController = void 0;
const joi_1 = __importDefault(require("joi"));
const authenticate_1 = require("../../utils/authenticate");
const approvalServices_1 = require("./approvalServices");
const approvalService = new approvalServices_1.ApprovalServices();
exports.approvalController = [
    {
        method: 'PATCH',
        path: '/api/v1/approvals/{id}',
        handler: approvalService.updateApproval.bind(approvalService),
        options: {
            pre: [authenticate_1.authenticate],
            validate: {
                params: joi_1.default.object({ id: joi_1.default.string().required() }),
                payload: joi_1.default.object({
                    status: joi_1.default.string().valid('approved', 'rejected').required(),
                }),
            },
        },
    },
];
