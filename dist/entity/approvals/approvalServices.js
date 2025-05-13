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
exports.ApprovalServices = void 0;
const approvals_1 = require("./approvals");
const leaveRequests_1 = require("../leaveRequests/leaveRequests");
const database_1 = require("../../db/database");
const leaveDetail_1 = require("../leaveDetails/leaveDetail");
const approvalRepo = database_1.dataSource.getRepository(approvals_1.Approval);
const leaveRepo = database_1.dataSource.getRepository(leaveRequests_1.LeaveRequest);
const leaveDetailRepo = database_1.dataSource.getRepository(leaveDetail_1.LeaveDetail);
class ApprovalServices {
    updateApproval(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { id } = request.params;
            const { status } = request.payload;
            const user = request.plugins['user'];
            const approval = yield approvalRepo.findOne({
                where: { leaveRequest: { id } },
                relations: ['leaveRequest', 'leaveRequest.employee', 'leaveRequest.employee.manager', 'leaveRequest.leaveType'],
            });
            if (!approval)
                return h.response({ message: 'Approval not found' }).code(404);
            const leaveEmployee = approval.leaveRequest.employee;
            // Determine which role is approving
            const isManager = ((_a = leaveEmployee.manager) === null || _a === void 0 ? void 0 : _a.id) === user.id;
            const isHr = user.role === 'hr';
            const isDirector = user.role === 'director';
            if (status == 'rejected') {
                approval.managerApproval = status;
                approval.hrApproval = status;
                approval.managerApproval = status;
            }
            else if (isManager) {
                approval.managerApproval = status;
            }
            else if (isHr) {
                approval.hrApproval = status;
            }
            else if (isDirector) {
                approval.directorApproval = status;
            }
            else {
                return h.response({ message: 'Unauthorized' }).code(403);
            }
            console.log(approval);
            // Determine overall status
            if ((approval.managerApproval === 'approved' || approval.managerApproval === 'not_required') &&
                (approval.hrApproval === 'approved' || approval.hrApproval === 'not_required') &&
                (approval.directorApproval === 'approved' || approval.directorApproval === 'not_required')) {
                approval.overallStatus = 'approved';
                approval.leaveRequest.status = 'approved';
                const detail = yield leaveDetailRepo.findOne({
                    where: {
                        employee: { id: leaveEmployee.id },
                        leaveType: { id: approval.leaveRequest.leaveType.id },
                    },
                    relations: ['employee', 'leaveType'],
                });
                if (detail) {
                    detail.used += approval.leaveRequest.duration;
                    detail.remaining -= approval.leaveRequest.duration;
                    yield leaveDetailRepo.save(detail);
                }
            }
            else if (approval.managerApproval === 'rejected' ||
                approval.hrApproval === 'rejected' ||
                approval.directorApproval === 'rejected') {
                approval.overallStatus = 'rejected';
                approval.leaveRequest.status = 'rejected';
            }
            else {
                approval.overallStatus = 'pending';
            }
            yield approvalRepo.save(approval);
            yield leaveRepo.save(approval.leaveRequest);
            return h.response({ message: `Leave ${status} successfully` }).code(200);
        });
    }
}
exports.ApprovalServices = ApprovalServices;
