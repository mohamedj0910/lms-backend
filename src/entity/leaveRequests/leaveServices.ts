import { Request, ResponseToolkit } from '@hapi/hapi';
import { LeaveRequest } from './leaveRequests';
import { LeaveType } from '../leaveTypes/leaveType';
import { Approval } from '../approvals/approvals';
import { Employee } from '../users/users';
import { dataSource } from '../../db/database';
import { LeaveDetail } from '../leaveDetails/leaveDetail';
import { In } from 'typeorm';

const leaveRepo = dataSource.getRepository(LeaveRequest);
const leaveTypeRepo = dataSource.getRepository(LeaveType);
const approvalRepo = dataSource.getRepository(Approval);
const employeeRepo = dataSource.getRepository(Employee);
const leaveDetailRepo = dataSource.getRepository(LeaveDetail);

export class LeaveServices {
  private calculateLeaveDuration(start: string, end: string): number {
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
    return Math.ceil(diff) + 1;
  }

  async createLeaveRequest(request: Request, h: ResponseToolkit) {
    const { startDate, endDate, reason, leaveTypeName } = request.payload as any;
    const user = request.plugins['user'];
    const employee = await employeeRepo.findOne({ where: { id: user.id } });
    const leaveType = await leaveTypeRepo.findOne({ where: { type: leaveTypeName } });

    if (!employee) return h.response({ message: 'Employee not found' }).code(400);
    if (!leaveType) return h.response({ message: 'Leave type not found' }).code(400);

    const duration = this.calculateLeaveDuration(startDate, endDate);
    if (duration < 0) {
      return h.response({ message: 'Invalid start and end date' }).code(400);
    }

    const leaveRequest = new LeaveRequest();
    leaveRequest.employee = employee;
    leaveRequest.leaveType = leaveType;
    leaveRequest.reason = reason;
    leaveRequest.startDate = startDate;
    leaveRequest.endDate = endDate;
    leaveRequest.status = 'pending';
    leaveRequest.duration = duration;
    await leaveRepo.save(leaveRequest);

    if (leaveType.type.toLowerCase() === 'sick leave') {
      await this.autoApproveAndDeductLeave(leaveRequest, duration);
    } else {
      const approvalLevels = duration <= 2 ? ['manager'] : duration <= 5 ? ['manager', 'hr'] : ['manager', 'hr', 'director'];
      await this.createApprovalRecord(leaveRequest, ...approvalLevels);
    }

    return h.response({ message: 'Leave request submitted successfully' }).code(201);
  }

  private async autoApproveAndDeductLeave(leaveRequest: LeaveRequest, duration: number) {
    const approval = new Approval();
    approval.leaveRequest = leaveRequest;
    approval.managerApproval = 'approved';
    approval.hrApproval = 'approved';
    approval.directorApproval = 'approved';
    approval.overallStatus = 'approved';

    leaveRequest.status = 'approved';
    await approvalRepo.save(approval);
    await leaveRepo.save(leaveRequest);

    await this.deductLeave(leaveRequest, duration);
  }

  private async deductLeave(leaveRequest: LeaveRequest, duration: number) {
    const leaveDetail = await leaveDetailRepo.findOne({
      where: {
        employee: { id: leaveRequest.employee.id },
        leaveType: { id: leaveRequest.leaveType.id },
      },
      relations: ['employee', 'leaveType'],
    });

    if (!leaveDetail) return;

    leaveDetail.used += duration;
    leaveDetail.remaining -= duration;
    await leaveDetailRepo.save(leaveDetail);
  }

  private async createApprovalRecord(leaveRequest: LeaveRequest, ...levels: string[]) {
    const approval = new Approval();
    approval.leaveRequest = leaveRequest;

    approval.managerApproval = levels.includes('manager') ? 'pending' : 'not_required';
    approval.hrApproval = levels.includes('hr') ? 'pending' : 'not_required';
    approval.directorApproval = levels.includes('director') ? 'pending' : 'not_required';
    approval.overallStatus = 'pending';

    await approvalRepo.save(approval);
  }

  async getAllLeaveRequests(request: Request, h: ResponseToolkit) {
    const user = request.plugins['user'];

    if (user.role !== 'hr' && user.role !== 'director') {
      return h.response({ message: 'Access denied' }).code(403);
    }

    const all = await leaveRepo.find({
      relations: ['employee', 'leaveType', 'approval'],
      order: { createdAt: 'DESC' },
    });

    return h.response(all).code(200);
  }

  async getMyLeaveRequests(request: Request, h: ResponseToolkit) {
    const user = request.plugins['user'];
    console.log(user)

    const leaves = await leaveRepo.find({
      where: { employee: { id: user.id } },
      relations: ['employee', 'leaveType', 'approval'],
      order: { createdAt: 'DESC' },
    });
    return h.response(leaves).code(200);
  }

  async getPendingSubordinateRequests(request: Request, h: ResponseToolkit) {
    const user = request.plugins['user'];

    const manager = await employeeRepo.findOne({
      where: { id: user.id },
      relations: ['subordinates'],
    });

    const subordinateIds = manager?.subordinates.map((emp) => emp.id) || [];

    const requests = await leaveRepo.find({
      where: {
        employee: { id: In(subordinateIds) },
        approval: { managerApproval: 'pending' },
      },
      relations: ['employee', 'leaveType', 'approval'],
      order: { createdAt: 'DESC' },
    });

    return h.response(requests).code(200);
  }

  async getPendingHRApprovals(request: Request, h: ResponseToolkit) {
    const user = request.plugins['user'];
    if (user.role !== 'hr') {
      return h.response({ message: 'Access denied' }).code(403);
    }

    const approvals = await approvalRepo.find({
      where: { hrApproval: 'pending' },
      relations: ['leaveRequest', 'leaveRequest.employee', 'leaveRequest.leaveType'],
      order: { createdAt: 'DESC' },
    });

    const pending = approvals.map((a) => a.leaveRequest);
    return h.response(pending).code(200);
  }

  async getPendingDirectorApprovals(request: Request, h: ResponseToolkit) {
    const user = request.plugins['user'];
    if (user.role !== 'director') {
      return h.response({ message: 'Access denied' }).code(403);
    }

    const approvals = await approvalRepo.find({
      where: { directorApproval: 'pending' },
      relations: ['leaveRequest', 'leaveRequest.employee', 'leaveRequest.leaveType'],
      order: { createdAt: 'DESC' },
    });

    const pending = approvals.map((a) => a.leaveRequest);
    return h.response(pending).code(200);
  }

  async cancelLeaveRequest(request: Request, h: ResponseToolkit) {
    const { id } = request.params;
    const user = request.plugins['user'];
    if (!user) {
      return h.response({ message: "Un autherized" })
    }
    // Fetch the leave request with the employee and leaveType data
    const leave = await leaveRepo.findOne({
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
    await leaveRepo.save(leave);

    // Update the employee's leave details (allocated, used, remaining)
    const leaveDetail = await leaveDetailRepo.findOne({
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
    if (leaveDetail.remaining < leaveDetail.allocated && leave.approval.overallStatus=='approved') {
      leaveDetail.used -= Number(leave.duration); // Reduce the used leave
      leaveDetail.remaining += Number(leave.duration); // Add the canceled days back to remaining leave
    }

    await leaveDetailRepo.save(leaveDetail);

    return h.response({ message: 'Leave request cancelled and leave details updated' }).code(200);
  }

}