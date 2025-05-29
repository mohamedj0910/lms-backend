import { Request, ResponseToolkit } from '@hapi/hapi';
import { Approval } from './approvals';
import { LeaveRequest } from '../leaveRequests/leaveRequests';
import { dataSource } from '../../db/database';
import { LeaveDetail } from '../leaveDetails/leaveDetail';

const approvalRepo = dataSource.getRepository(Approval);
const leaveRepo = dataSource.getRepository(LeaveRequest);
const leaveDetailRepo = dataSource.getRepository(LeaveDetail)



export class ApprovalServices {
  async updateApproval(request: Request, h: ResponseToolkit) {
    const { id } = request.params;
    const { status } = request.payload as { status: 'approved' | 'rejected' };
    const user = request.plugins['user'];

    const approval = await approvalRepo.findOne({
      where: { leaveRequest: { id } },
      relations: ['leaveRequest', 'leaveRequest.employee', 'leaveRequest.employee.manager', 'leaveRequest.leaveType'],
    });

    if (!approval) return h.response({ message: 'Approval not found' }).code(404);

    const leaveEmployee = approval.leaveRequest.employee;

    const isManager = leaveEmployee.manager?.id === user.id;
    const isHr = user.role === 'hr';
    const isDirector = user.role === 'director';
    if (status == 'rejected') {
      approval.managerApproval = status;
      approval.hrApproval = status;
      approval.managerApproval = status;
    }
    else if (isDirector) {
      approval.directorApproval = status;
    }
    else if(isHr && isManager){
      const approveHr = approval.managerApproval=='approved' || approval.managerApproval=='not_required';
      const approveManager = approval.managerApproval!='not_required'
      if(approveHr){
        approval.hrApproval = 'approved'
      }
      else if(approveManager){
        approval.managerApproval = 'approved'
      }
    }
    else if (isHr) {
      approval.hrApproval = status;
    }
    else if (isManager) {
      approval.managerApproval = status;
    } else {
      return h.response({ message: 'Unauthorized' }).code(403);
    }

    if (
      (approval.managerApproval === 'approved' || approval.managerApproval === 'not_required') &&
      (approval.hrApproval === 'approved' || approval.hrApproval === 'not_required') &&
      (approval.directorApproval === 'approved' || approval.directorApproval === 'not_required')
    ) {
      approval.overallStatus = 'approved';
      approval.leaveRequest.status = 'approved';

      const detail = await leaveDetailRepo.findOne({
        where: {
          employee: { id: leaveEmployee.id },
          leaveType: { id: approval.leaveRequest.leaveType.id },
        },
        relations: ['employee', 'leaveType'],
      });

      if (detail) {
        detail.used += approval.leaveRequest.duration as number;
        detail.remaining -= approval.leaveRequest.duration as number;
        await leaveDetailRepo.save(detail);
      }
    } else if (
      approval.managerApproval === 'rejected' ||
      approval.hrApproval === 'rejected' ||
      approval.directorApproval === 'rejected'
    ) {
      approval.overallStatus = 'rejected';
      approval.leaveRequest.status = 'rejected';
    } else {
      approval.overallStatus = 'pending';
    }

    await approvalRepo.save(approval);
    await leaveRepo.save(approval.leaveRequest);
    return h.response({ message: `Leave ${status} successfully` }).code(200);
  }
}
