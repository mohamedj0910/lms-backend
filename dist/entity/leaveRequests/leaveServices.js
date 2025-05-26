"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveServices = void 0;
const leaveRequests_1 = require("./leaveRequests");
const leaveType_1 = require("../leaveTypes/leaveType");
const approvals_1 = require("../approvals/approvals");
const users_1 = require("../users/users");
const database_1 = require("../../db/database");
const leaveDetail_1 = require("../leaveDetails/leaveDetail");
const typeorm_1 = require("typeorm");
const leaveRepo = database_1.dataSource.getRepository(leaveRequests_1.LeaveRequest);
const leaveTypeRepo = database_1.dataSource.getRepository(leaveType_1.LeaveType);
const approvalRepo = database_1.dataSource.getRepository(approvals_1.Approval);
const employeeRepo = database_1.dataSource.getRepository(users_1.Employee);
const leaveDetailRepo = database_1.dataSource.getRepository(leaveDetail_1.LeaveDetail);
class LeaveServices {
    calculateLeaveDuration(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error('Invalid date format');
        }
        const diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        return diff < 0 ? 0 : Math.ceil(diff) || 1; // Same-day leave has duration of 1
    }
    createLeaveRequest(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const { startDate, endDate, reason, leaveTypeName } = request.payload;
            const user = request.plugins['user'];
            // Validate input
            if (!startDate || !endDate || !reason || !leaveTypeName) {
                return h.response({ message: 'Missing required fields' }).code(400);
            }
            if (reason.length > 500) {
                return h.response({ message: 'Reason exceeds maximum length of 500 characters' }).code(400);
            }
            // Validate dates
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return h.response({ message: 'Invalid date format' }).code(400);
            }
            if (start < today) {
                return h.response({ message: 'Start date cannot be in the past' }).code(400);
            }
            if (end < start) {
                return h.response({ message: 'End date cannot be before start date' }).code(400);
            }
            return yield database_1.dataSource.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                const employee = yield manager.findOne(users_1.Employee, {
                    where: { id: user.id },
                    relations: ['manager'],
                });
                if (!employee) {
                    return h.response({ message: 'Employee not found' }).code(400);
                }
                const leaveType = yield manager.findOne(leaveType_1.LeaveType, {
                    where: { type: leaveTypeName },
                });
                if (!leaveType) {
                    return h.response({ message: 'Leave type not found' }).code(400);
                }
                const duration = this.calculateLeaveDuration(startDate, endDate);
                if (duration === 0) {
                    return h.response({ message: 'Invalid date range' }).code(400);
                }
                // Check for overlapping leave requests
                const existingOverlap = yield manager.findOne(leaveRequests_1.LeaveRequest, {
                    where: {
                        employee: { id: employee.id },
                        status: (0, typeorm_1.In)(['pending', 'approved']),
                        startDate: (0, typeorm_1.LessThanOrEqual)(endDate),
                        endDate: (0, typeorm_1.MoreThanOrEqual)(startDate),
                    },
                });
                if (existingOverlap) {
                    return h.response({
                        message: 'You have already applied for leave during this period.',
                    }).code(409);
                }
                const leaveRequest = new leaveRequests_1.LeaveRequest();
                leaveRequest.employee = employee;
                leaveRequest.leaveType = leaveType;
                leaveRequest.reason = reason;
                leaveRequest.startDate = startDate;
                leaveRequest.endDate = endDate;
                leaveRequest.status = 'pending';
                leaveRequest.duration = duration;
                // Save leave request
                yield manager.save(leaveRequests_1.LeaveRequest, leaveRequest);
                // Handle sick leave auto-approval
                if (leaveType.type.toLowerCase() === 'sick leave') {
                    const leaveDetail = yield manager.findOne(leaveDetail_1.LeaveDetail, {
                        where: {
                            employee: { id: employee.id },
                            leaveType: { id: leaveType.id },
                        },
                        relations: ['employee', 'leaveType'],
                    });
                    if (!leaveDetail || leaveDetail.remaining < duration) {
                        return h.response({ message: 'Insufficient leave balance for sick leave' }).code(400);
                    }
                    yield this.autoApproveAndDeductLeave(leaveRequest, duration, manager);
                }
                else {
                    // Get approvers based on employee and duration
                    const approvers = yield this.findApprovers(employee, duration);
                    yield this.createApprovalRecord(leaveRequest, manager, ...approvers);
                }
                return h.response({ message: 'Leave request submitted successfully' }).code(201);
            })).catch((error) => {
                return h.response({ message: `Failed to create leave request: ${error.message}` }).code(500);
            });
        });
    }
    autoApproveAndDeductLeave(leaveRequest, duration, manager) {
        return __awaiter(this, void 0, void 0, function* () {
            const approval = new approvals_1.Approval();
            approval.leaveRequest = leaveRequest;
            approval.managerApproval = 'not_required';
            approval.hrApproval = 'approved';
            approval.directorApproval = 'not_required';
            approval.overallStatus = 'approved';
            leaveRequest.status = 'approved';
            yield manager.save(approvals_1.Approval, approval);
            yield manager.save(leaveRequests_1.LeaveRequest, leaveRequest);
            yield this.deductLeave(leaveRequest, duration, manager);
        });
    }
    deductLeave(leaveRequest, duration, manager) {
        return __awaiter(this, void 0, void 0, function* () {
            const leaveDetail = yield manager.findOne(leaveDetail_1.LeaveDetail, {
                where: {
                    employee: { id: leaveRequest.employee.id },
                    leaveType: { id: leaveRequest.leaveType.id },
                },
                relations: ['employee', 'leaveType'],
            });
            if (!leaveDetail) {
                throw new Error('Leave details not found');
            }
            if (leaveDetail.remaining < duration) {
                throw new Error('Insufficient leave balance');
            }
            leaveDetail.used += duration;
            leaveDetail.remaining -= duration;
            yield manager.save(leaveDetail_1.LeaveDetail, leaveDetail);
        });
    }
    createApprovalRecord(leaveRequest, manager, ...levels) {
        return __awaiter(this, void 0, void 0, function* () {
            const approval = new approvals_1.Approval();
            approval.leaveRequest = leaveRequest;
            approval.managerApproval = levels.includes('manager') ? 'pending' : 'not_required';
            approval.hrApproval = levels.includes('hr') ? 'pending' : 'not_required';
            approval.directorApproval = levels.includes('director') ? 'pending' : 'not_required';
            approval.overallStatus = 'pending';
            yield manager.save(approvals_1.Approval, approval);
        });
    }
    findApprovers(employee, duration) {
        return __awaiter(this, void 0, void 0, function* () {
            const approvers = new Set();
            // Load employee with manager relationship
            const fullEmployee = yield employeeRepo.findOne({
                where: { id: employee.id },
                relations: ['manager'],
            });
            const hasManager = !!(fullEmployee === null || fullEmployee === void 0 ? void 0 : fullEmployee.manager);
            const isHR = employee.role === 'hr';
            const isDirector = employee.role === 'director';
            // Check for HR and director existence
            const hrExists = yield employeeRepo.findOne({ where: { role: 'hr' } });
            const directorExists = yield employeeRepo.findOne({ where: { role: 'director' } });
            // Approval rules
            if (isDirector) {
                // Directors require no approval
                return [];
            }
            else if (duration <= 2) {
                if (hasManager) {
                    approvers.add('manager');
                }
                else if (hrExists) {
                    approvers.add('hr');
                }
                else if (directorExists) {
                    approvers.add('director');
                }
                else {
                    throw new Error('No valid approvers available');
                }
            }
            else if (duration <= 5) {
                if (hasManager) {
                    approvers.add('manager');
                }
                if (!isHR && hrExists) {
                    approvers.add('hr');
                }
                else if (!hasManager && !isHR && directorExists) {
                    approvers.add('director');
                }
                else if (!hrExists && !directorExists) {
                    throw new Error('No valid approvers available');
                }
            }
            else {
                if (hasManager) {
                    approvers.add('manager');
                }
                if (!isHR && hrExists) {
                    approvers.add('hr');
                }
                if (directorExists) {
                    approvers.add('director');
                }
                else if (!hasManager && !hrExists) {
                    throw new Error('No valid approvers available');
                }
            }
            return Array.from(approvers);
        });
    }
    getAllLeaveRequests(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = request.plugins['user'];
            if (user.role !== 'hr' && user.role !== 'director') {
                return h.response({ message: 'Access denied' }).code(403);
            }
            const all = yield leaveRepo.find({
                relations: ['employee', 'leaveType', 'approval'],
                order: { createdAt: 'DESC' },
            });
            return h.response(all).code(200);
        });
    }
    getMyLeaveRequests(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = request.plugins['user'];
            const leaves = yield leaveRepo.find({
                where: { employee: { id: user.id } },
                relations: ['employee', 'leaveType', 'approval'],
                order: { createdAt: 'DESC' },
            });
            return h.response(leaves).code(200);
        });
    }
    getPendingSubordinateRequests(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = request.plugins['user'];
            const manager = yield employeeRepo.findOne({
                where: { id: user.id },
                relations: ['subordinates'],
            });
            const subordinateIds = (manager === null || manager === void 0 ? void 0 : manager.subordinates.map((emp) => emp.id)) || [];
            const requests = yield leaveRepo.find({
                where: {
                    employee: { id: (0, typeorm_1.In)(subordinateIds) },
                    approval: { managerApproval: 'pending' },
                },
                relations: ['employee', 'leaveType', 'approval'],
                order: { createdAt: 'DESC' },
            });
            return h.response(requests).code(200);
        });
    }
    getPendingHRApprovals(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = request.plugins['user'];
            if (user.role !== 'hr') {
                return h.response({ message: 'Access denied' }).code(403);
            }
            const approvals = yield approvalRepo.find({
                where: { hrApproval: 'pending' },
                relations: ['leaveRequest', 'leaveRequest.employee', 'leaveRequest.leaveType'],
                order: { createdAt: 'DESC' },
            });
            const pending = approvals.map((a) => a.leaveRequest);
            return h.response(pending).code(200);
        });
    }
    getPendingDirectorApprovals(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = request.plugins['user'];
            if (user.role !== 'director') {
                return h.response({ message: 'Access denied' }).code(403);
            }
            const approvals = yield approvalRepo.find({
                where: { directorApproval: 'pending' },
                relations: ['leaveRequest', 'leaveRequest.employee', 'leaveRequest.leaveType'],
                order: { createdAt: 'DESC' },
            });
            const pending = approvals.map((a) => a.leaveRequest);
            return h.response(pending).code(200);
        });
    }
    cancelLeaveRequest(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const { id } = request.params;
            const user = request.plugins['user'];
            if (!user) {
                return h.response({ message: 'Unauthorized' }).code(401);
            }
            return yield database_1.dataSource.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                const leave = yield manager.findOne(leaveRequests_1.LeaveRequest, {
                    where: { id },
                    relations: ['employee', 'leaveType', 'approval'],
                });
                if (!leave) {
                    return h.response({ message: 'Leave request not found' }).code(404);
                }
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const leaveStart = new Date(leave.startDate);
                if (leave.employee.id !== user.id || leaveStart <= today) {
                    return h.response({ message: 'Cannot cancel this leave request' }).code(403);
                }
                if (leave.status === 'cancelled' || leave.status === 'rejected') {
                    return h.response({ message: `Cannot cancel a ${leave.status} leave request` }).code(400);
                }
                leave.status = 'cancelled';
                yield manager.save(leaveRequests_1.LeaveRequest, leave);
                if (leave.approval && leave.approval.overallStatus === 'approved') {
                    const leaveDetail = yield manager.findOne(leaveDetail_1.LeaveDetail, {
                        where: {
                            employee: { id: leave.employee.id },
                            leaveType: { id: leave.leaveType.id },
                        },
                        relations: ['employee', 'leaveType'],
                    });
                    if (!leaveDetail) {
                        return h.response({ message: 'Leave details not found' }).code(404);
                    }
                    leaveDetail.used = Math.max(0, leaveDetail.used - Number(leave.duration));
                    leaveDetail.remaining = Math.min(leaveDetail.allocated, leaveDetail.remaining + Number(leave.duration));
                    yield manager.save(leaveDetail_1.LeaveDetail, leaveDetail);
                }
                return h.response({ message: 'Leave request cancelled and leave details updated' }).code(200);
            })).catch((error) => {
                return h.response({ message: `Failed to cancel leave request: ${error.message}` }).code(500);
            });
        });
    }
    getSubordinatesLeaveRequests(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = request.plugins['user'];
            const manager = yield employeeRepo.findOne({
                where: { id: user.id },
                relations: ['subordinates'],
            });
            if (!manager || !manager.isManager) {
                return h.response({ message: 'You are not authorized or not a manager.' }).code(403);
            }
            const subordinateIds = manager.subordinates.map((emp) => emp.id);
            const leaveRequests = yield leaveRepo.find({
                where: {
                    employee: { id: (0, typeorm_1.In)(subordinateIds) },
                },
                relations: ['employee', 'leaveType'],
                order: { createdAt: 'DESC' },
            });
            const formattedLeaves = leaveRequests.map((leave) => ({
                id: leave.id,
                employeeName: leave.employee.fullName,
                leaveType: leave.leaveType.type,
                startDate: leave.startDate,
                endDate: leave.endDate,
            }));
            return h.response(formattedLeaves).code(200);
        });
    }
}
exports.LeaveServices = LeaveServices;
