"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveDetailsController = void 0;
const leaveDetailsService_1 = require("./leaveDetailsService");
const authenticate_1 = require("../../utils/authenticate");
const leaveDetailService = new leaveDetailsService_1.LeaveDetailService();
const leaveDetail = new leaveDetailsService_1.LeaveDetailService();
exports.leaveDetailsController = [
    {
        method: 'GET',
        path: '/api/v1/leave-details/me',
        handler: leaveDetailService.getMyLeaveDetails,
        options: {
            pre: [{ method: authenticate_1.authenticate }], // your custom auth logic
        },
    },
    {
        method: 'GET',
        path: '/api/v1/leave-details/subordinates',
        handler: leaveDetailService.getSubordinatesLeaveDetails,
        options: {
            pre: [{ method: authenticate_1.authenticate }],
        },
    },
    {
        method: 'GET',
        path: '/api/v1/leave-details/all',
        handler: leaveDetailService.getAllEmployeeLeaveDetails,
        options: {
            pre: [{ method: authenticate_1.authenticate }],
        },
    }
];
