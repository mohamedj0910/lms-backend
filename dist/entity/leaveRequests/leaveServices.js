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
        const diff = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
        return Math.ceil(diff) + 1;
    }
    createLeaveRequest(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const { startDate, endDate, reason, leaveTypeName } = request.payload;
            const user = request.plugins['user'];
            const employee = yield employeeRepo.findOne({ where: { id: user.id } });
            const leaveType = yield leaveTypeRepo.findOne({ where: { type: leaveTypeName } });
            if (!employee)
                return h.response({ message: 'Employee not found' }).code(400);
            if (!leaveType)
                return h.response({ message: 'Leave type not found' }).code(400);
            const duration = this.calculateLeaveDuration(startDate, endDate);
            if (duration < 0) {
                return h.response({ message: 'Invalid start and end date' }).code(400);
            }
            const leaveRequest = new leaveRequests_1.LeaveRequest();
            leaveRequest.employee = employee;
            leaveRequest.leaveType = leaveType;
            leaveRequest.reason = reason;
            leaveRequest.startDate = startDate;
            leaveRequest.endDate = endDate;
            leaveRequest.status = 'pending';
            leaveRequest.duration = duration;
            yield leaveRepo.save(leaveRequest);
            if (leaveType.type.toLowerCase() === 'sick leave') {
                yield this.autoApproveAndDeductLeave(leaveRequest, duration);
            }
            else {
                const approvalLevels = duration <= 2 ? ['manager'] : duration <= 5 ? ['manager', 'hr'] : ['manager', 'hr', 'director'];
                yield this.createApprovalRecord(leaveRequest, ...approvalLevels);
            }
            return h.response({ message: 'Leave request submitted successfully' }).code(201);
        });
    }
    autoApproveAndDeductLeave(leaveRequest, duration) {
        return __awaiter(this, void 0, void 0, function* () {
            const approval = new approvals_1.Approval();
            approval.leaveRequest = leaveRequest;
            approval.managerApproval = 'approved';
            approval.hrApproval = 'approved';
            approval.directorApproval = 'approved';
            approval.overallStatus = 'approved';
            leaveRequest.status = 'approved';
            yield approvalRepo.save(approval);
            yield leaveRepo.save(leaveRequest);
            yield this.deductLeave(leaveRequest, duration);
        });
    }
    deductLeave(leaveRequest, duration) {
        return __awaiter(this, void 0, void 0, function* () {
            const leaveDetail = yield leaveDetailRepo.findOne({
                where: {
                    employee: { id: leaveRequest.employee.id },
                    leaveType: { id: leaveRequest.leaveType.id },
                },
                relations: ['employee', 'leaveType'],
            });
            if (!leaveDetail)
                return;
            leaveDetail.used += duration;
            leaveDetail.remaining -= duration;
            yield leaveDetailRepo.save(leaveDetail);
        });
    }
    createApprovalRecord(leaveRequest, ...levels) {
        return __awaiter(this, void 0, void 0, function* () {
            const approval = new approvals_1.Approval();
            approval.leaveRequest = leaveRequest;
            approval.managerApproval = levels.includes('manager') ? 'pending' : 'not_required';
            approval.hrApproval = levels.includes('hr') ? 'pending' : 'not_required';
            approval.directorApproval = levels.includes('director') ? 'pending' : 'not_required';
            approval.overallStatus = 'pending';
            yield approvalRepo.save(approval);
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
            console.log(user);
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
                return h.response({ message: "Un autherized" });
            }
            // Fetch the leave request with the employee and leaveType data
            const leave = yield leaveRepo.findOne({
                where: { id },
                relations: ['employee', 'leaveType'],
            });
            if (!leave) {
                return h.response({ message: 'Leave request not found' }).code(404);
            }
            const currentDate = new Date().toISOString().split('T')[0];
            // Check if the leave request is made by the user and if the leave is in the future
            if (leave.employee.id !== user.id || leave.startDate <= currentDate) {
                return h.response({ message: 'Cannot cancel this leave request' }).code(403);
            }
            // Set leave status to 'cancelled'
            leave.status = 'cancelled';
            yield leaveRepo.save(leave);
            // Update the employee's leave details (allocated, used, remaining)
            const leaveDetail = yield leaveDetailRepo.findOne({
                where: {
                    employee: { id: leave.employee.id },
                    leaveType: { id: leave.leaveType.id },
                },
                relations: ['employee', 'leaveType'],
            });
            if (!leaveDetail) {
                return h.response({ message: 'Leave details not found for this leave type' }).code(404);
            }
            // Assuming leave.duration is the number of days the employee took for the leave request
            if (leaveDetail.remaining < leaveDetail.allocated && leave.approval.overallStatus == 'approved') {
                leaveDetail.used -= Number(leave.duration); // Reduce the used leave
                leaveDetail.remaining += Number(leave.duration); // Add the canceled days back to remaining leave
            }
            yield leaveDetailRepo.save(leaveDetail);
            return h.response({ message: 'Leave request cancelled and leave details updated' }).code(200);
        });
    }
}
exports.LeaveServices = LeaveServices;
