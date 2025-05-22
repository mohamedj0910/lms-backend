"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveReqController = void 0;
const joi_1 = __importDefault(require("joi"));
const authenticate_1 = require("../../utils/authenticate");
const leaveServices_1 = require("./leaveServices");
const leaveService = new leaveServices_1.LeaveServices();
exports.leaveReqController = [
    // Create leave request
    {
        method: 'POST',
        path: '/api/v1/leave-request',
        handler: leaveService.createLeaveRequest.bind(leaveService),
        options: {
            pre: [authenticate_1.authenticate],
            validate: {
                payload: joi_1.default.object({
                    startDate: joi_1.default.date().required(),
                    endDate: joi_1.default.date().required(),
                    reason: joi_1.default.string().required(),
                    leaveTypeName: joi_1.default.string().required(),
                }),
            },
        },
    },
    // My leave requests
    {
        method: 'GET',
        path: '/api/v1/leave-requests/myreqs',
        handler: leaveService.getMyLeaveRequests.bind(leaveService),
        options: { pre: [authenticate_1.authenticate] },
    },
    // Manager: Subordinates’ pending requests
    {
        method: 'GET',
        path: '/api/v1/leave-requests/manager/pending',
        handler: leaveService.getPendingSubordinateRequests.bind(leaveService),
        options: { pre: [authenticate_1.authenticate] },
    },
    // HR: Pending approvals
    {
        method: 'GET',
        path: '/api/v1/leave-requests/hr/pending',
        handler: leaveService.getPendingHRApprovals.bind(leaveService),
        options: { pre: [authenticate_1.authenticate] },
    },
    // Director: Pending approvals
    {
        method: 'GET',
        path: '/api/v1/leave-requests/director/pending',
        handler: leaveService.getPendingDirectorApprovals.bind(leaveService),
        options: { pre: [authenticate_1.authenticate] },
    },
    // Cancel leave
    {
        method: 'PATCH',
        path: '/api/v1/leave-requests/cancel/{id}',
        handler: leaveService.cancelLeaveRequest.bind(leaveService),
        options: {
            pre: [authenticate_1.authenticate],
            validate: {
                params: joi_1.default.object({
                    id: joi_1.default.string().uuid().required(),
                }),
            },
        },
    },
    {
        method: 'GET',
        path: '/api/v1/leaves/manager',
        handler: leaveService.getSubordinatesLeaveRequests.bind(leaveService),
        options: {
            pre: [authenticate_1.authenticate]
        }
    },
];
