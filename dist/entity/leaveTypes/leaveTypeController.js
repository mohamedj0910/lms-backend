"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveTypeController = void 0;
const joi_1 = __importDefault(require("joi"));
const authenticate_1 = require("../../utils/authenticate");
const leaveTypeServices_1 = require("./leaveTypeServices");
const leaveTypeService = new leaveTypeServices_1.LeaveTypeServices();
exports.leaveTypeController = [
    {
        method: 'POST',
        path: '/api/v1/leave-types',
        handler: leaveTypeService.addLeaveType.bind(leaveTypeService),
        options: {
            pre: [authenticate_1.authenticate],
            validate: {
                payload: joi_1.default.object({
                    type: joi_1.default.string().required(),
                    maxLeave: joi_1.default.number().positive().required(),
                }),
            },
        },
    },
];
