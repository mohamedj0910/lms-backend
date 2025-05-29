import { Request, ResponseToolkit } from '@hapi/hapi';
import { LeaveRequest } from './leaveRequests';
import { LeaveType } from '../leaveTypes/leaveType';
import { Approval } from '../approvals/approvals';
import { Employee } from '../users/users';
import { dataSource } from '../../db/database';
import { LeaveDetail } from '../leaveDetails/leaveDetail';
import { In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

const leaveRepo = dataSource.getRepository(LeaveRequest);
const leaveTypeRepo = dataSource.getRepository(LeaveType);
const approvalRepo = dataSource.getRepository(Approval);
const employeeRepo = dataSource.getRepository(Employee);
const leaveDetailRepo = dataSource.getRepository(LeaveDetail);

export class LeaveServices {
  private calculateLeaveDuration(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format');
    }
    const diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return diff < 0 ? 0 : Math.ceil(diff) || 1; // Same-day leave has duration of 1
  }

  async createLeaveRequest(request: Request, h: ResponseToolkit) {
    const { startDate, endDate, reason, leaveTypeName } = request.payload as any;
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

    return await dataSource.transaction(async (manager) => {
      const employee = await manager.findOne(Employee, {
        where: { id: user.id },
        relations: ['manager'],
      });
      if (!employee) {
        return h.response({ message: 'Employee not found' }).code(400);
      }

      const leaveType = await manager.findOne(LeaveType, {
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
      const existingOverlap = await manager.findOne(LeaveRequest, {
        where: {
          employee: { id: employee.id },
          status: In(['pending', 'approved']),
          startDate: LessThanOrEqual(endDate),
          endDate: MoreThanOrEqual(startDate),
        },
      });
      if (existingOverlap) {
        return h.response({
          message: 'You have already applied for leave during this period.',
        }).code(409);
      }

      const leaveRequest = new LeaveRequest();
      leaveRequest.employee = employee;
      leaveRequest.leaveType = leaveType;
      leaveRequest.reason = reason;
      leaveRequest.startDate = startDate;
      leaveRequest.endDate = endDate;
      leaveRequest.status = 'pending';
      leaveRequest.duration = duration;

      // Save leave request
      await manager.save(LeaveRequest, leaveRequest);

      // Handle sick leave auto-approval
      if (leaveType.type.toLowerCase() === 'sick leave') {
        const leaveDetail = await manager.findOne(LeaveDetail, {
          where: {
            employee: { id: employee.id },
            leaveType: { id: leaveType.id },
          },
          relations: ['employee', 'leaveType'],
        });
        if (!leaveDetail || leaveDetail.remaining < duration) {
          return h.response({ message: 'Insufficient leave balance for sick leave' }).code(400);
        }
        await this.autoApproveAndDeductLeave(leaveRequest, duration, manager);
      } else {
        // Get approvers based on employee and duration
        const approvers = await this.findApprovers(employee, duration);
        await this.createApprovalRecord(leaveRequest, manager, ...approvers);
      }

      return h.response({ message: 'Leave request submitted successfully' }).code(201);
    }).catch((error) => {
      return h.response({ message: `Failed to create leave request: ${error.message}` }).code(500);
    });
  }

  private async autoApproveAndDeductLeave(
    leaveRequest: LeaveRequest,
    duration: number,
    manager: any,
  ) {
    const approval = new Approval();
    approval.leaveRequest = leaveRequest;
    approval.managerApproval = 'not_required';
    approval.hrApproval = 'approved';
    approval.directorApproval = 'not_required';
    approval.overallStatus = 'approved';

    leaveRequest.status = 'approved';
    await manager.save(Approval, approval);
    await manager.save(LeaveRequest, leaveRequest);

    await this.deductLeave(leaveRequest, duration, manager);
  }

  private async deductLeave(leaveRequest: LeaveRequest, duration: number, manager: any) {
    const leaveDetail = await manager.findOne(LeaveDetail, {
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
    await manager.save(LeaveDetail, leaveDetail);
  }

  private async createApprovalRecord(leaveRequest: LeaveRequest, manager: any, ...levels: string[]) {
    const approval = new Approval();
    approval.leaveRequest = leaveRequest;

    approval.managerApproval = levels.includes('manager') ? 'pending' : 'not_required';
    approval.hrApproval = levels.includes('hr') ? 'pending' : 'not_required';
    approval.directorApproval = levels.includes('director') ? 'pending' : 'not_required';
    approval.overallStatus = 'pending';

    await manager.save(Approval, approval);
  }

  private async findApprovers(employee: Employee, duration: number): Promise<string[]> {
    const approvers = new Set<string>();

    // Load employee with manager relationship
    const fullEmployee = await employeeRepo.findOne({
      where: { id: employee.id },
      relations: ['manager'],
    });

    const hasManager = !!fullEmployee?.manager;
    const isHR = employee.role === 'hr';
    const isDirector = employee.role === 'director';

    // Check for HR and director existence
    const hrExists = await employeeRepo.findOne({ where: { role: 'hr' } });
    const directorExists = await employeeRepo.findOne({ where: { role: 'director' } });

    // Approval rules
    if (isDirector) {
      // Directors require no approval
      return [];
    } else if (duration <= 2) {
      if (hasManager) {
        approvers.add('manager');
      } else if (hrExists) {
        approvers.add('hr');
      } else if (directorExists) {
        approvers.add('director');
      } else {
        throw new Error('No valid approvers available');
      }
    } else if (duration <= 5) {
      if (hasManager) {
        approvers.add('manager');
      }
      if (!isHR && hrExists) {
        approvers.add('hr');
      } else if (!hasManager && !isHR && directorExists) {
        approvers.add('director');
      } else if (!hrExists && !directorExists) {
        throw new Error('No valid approvers available');
      }
    } else {
      if (hasManager) {
        approvers.add('manager');
      }
      if (!isHR && hrExists) {
        approvers.add('hr');
      }
      if (directorExists) {
        approvers.add('director');
      } else if (!hasManager && !hrExists) {
        throw new Error('No valid approvers available');
      }
    }

    return Array.from(approvers);
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
    const res = requests.map((req) => {
      return {
        id: req.id,
        fullName: req.employee.fullName,
        leaveType: req.leaveType.type,
        duration: req.duration,
        startDate: req.startDate,
        endDate: req.endDate,
        reason: req.reason,
      }
    })
    return h.response(res).code(200);
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
    const res = pending.map((req) => {
      return {
        id: req.id,
        fullName: req.employee.fullName,
        leaveType: req.leaveType.type,
        duration: req.duration,
        startDate: req.startDate,
        endDate: req.endDate,
        reason: req.reason,
      }
    })
    console.log(res)
    return h.response(res).code(200);
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
      return h.response({ message: 'Unauthorized' }).code(401);
    }

    return await dataSource.transaction(async (manager) => {
      const leave = await manager.findOne(LeaveRequest, {
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
      await manager.save(LeaveRequest, leave);

      if (leave.approval && leave.approval.overallStatus === 'approved') {
        const leaveDetail = await manager.findOne(LeaveDetail, {
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
        leaveDetail.remaining = Math.min(
          leaveDetail.allocated,
          leaveDetail.remaining + Number(leave.duration),
        );
        await manager.save(LeaveDetail, leaveDetail);
      }

      return h.response({ message: 'Leave request cancelled and leave details updated' }).code(200);
    }).catch((error) => {
      return h.response({ message: `Failed to cancel leave request: ${error.message}` }).code(500);
    });
  }

  async getSubordinatesLeaveRequests(request: Request, h: ResponseToolkit) {
    const user = request.plugins['user'];

    const manager = await employeeRepo.findOne({
      where: { id: user.id },
      relations: ['subordinates'],
    });

    if (!manager || !manager.isManager) {
      return h.response({ message: 'You are not authorized or not a manager.' }).code(403);
    }

    const subordinates = manager.subordinates;

    if (!subordinates.length) {
      return h.response([]).code(200);
    }

    const subordinateIds = subordinates.map((emp) => emp.id);

    // Fetch leave requests for all subordinates
    const leaveRequests = await leaveRepo.find({
      where: { employee: { id: In(subordinateIds) }, status: 'approved' },
      relations: ['employee', 'leaveType'],
      order: { createdAt: 'DESC' },
    });

    // Map leaves by employee ID
    const leavesByEmployeeId: Record<string, any[]> = {};
    leaveRequests.forEach((leave) => {
      const empId = leave.employee.id;
      if (!leavesByEmployeeId[empId]) {
        leavesByEmployeeId[empId] = [];
      }
      leavesByEmployeeId[empId].push({
        id: leave.id,
        leaveType: leave.leaveType.type,
        startDate: leave.startDate,
        endDate: leave.endDate,
      });
    });

    // Construct final response
    const response = subordinates.map((emp) => ({
      employeeName: emp.fullName,
      role: emp.role,
      leaveRequests: leavesByEmployeeId[emp.id] || [],
    }));

    return h.response(response).code(200);
  }

}