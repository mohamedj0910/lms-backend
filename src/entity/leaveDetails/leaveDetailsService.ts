import { Request, ResponseToolkit } from '@hapi/hapi';
import { dataSource } from '../../db/database';
import { LeaveDetail } from './leaveDetail';
import { Employee } from '../users/users';
import { In } from 'typeorm';

const leaveDetailRepo = dataSource.getRepository(LeaveDetail);
const empRepo = dataSource.getRepository(Employee);

export class LeaveDetailService {
  // 1. Get own leave details (for any user)
  async getMyLeaveDetails(request: Request, h: ResponseToolkit) {
    const user = request.plugins['user'];
    const userId = user?.id;

    if (!userId) {
      return h.response({ message: 'Unauthorized' }).code(401);
    }

    const leaveDetails = await leaveDetailRepo.find({
      where: { employee: { id: userId } },
      relations: ['employee', 'leaveType'],
    });
    if(!leaveDetails){
      return h.response({message:"No Leave Details Found"}).code(404)
    }
    const formatted = leaveDetails.map((detail) => ({
      leaveType: detail.leaveType.type,
      allocated: detail.allocated,
      used: detail.used,
      remaining: detail.remaining,
    }));

    return h.response({
      employee: {
        id: leaveDetails[0]?.employee.id,
        fullName: leaveDetails[0]?.employee.fullName,
        email: leaveDetails[0]?.employee.email,
      },
      leaveDetails: formatted,
    }).code(200);
  }

  // 2. Manager view of subordinates' leave details
  async getSubordinatesLeaveDetails(request: Request, h: ResponseToolkit) {
    const user = request.plugins['user'];
    const userId = user?.id;
    const emp = await empRepo.findOne({where:{id:userId}})

    if (!userId || emp.isManager) {
      return h.response({ message: 'Unauthorized or Forbidden' }).code(403);
    }

    const subordinates = await empRepo.find({
      where: { manager: { id: userId } },
    });

    const subordinateIds = subordinates.map((emp) => emp.id);

    if (subordinateIds.length === 0) {
      return h.response([]).code(200);
    }

    const leaveDetails = await leaveDetailRepo.find({
      where: { employee: { id: In(subordinateIds) } },
      relations: ['employee', 'leaveType'],
    });

    const grouped: Record<string, any> = {};

    for (const detail of leaveDetails) {
      const emp = detail.employee;
      const leaveInfo = {
        leaveType: detail.leaveType.type,
        allocated: detail.allocated,
        used: detail.used,
        remaining: detail.remaining,
      };

      if (!grouped[emp.id]) {
        grouped[emp.id] = {
          employee: {
            id: emp.id,
            fullName: emp.fullName,
            email: emp.email,
          },
          leaveDetails: [leaveInfo],
        };
      } else {
        grouped[emp.id].leaveDetails.push(leaveInfo);
      }
    }

    return h.response(Object.values(grouped)).code(200);
  }

  // 3. HR or Director view of all employees' leave details
  async getAllEmployeeLeaveDetails(request: Request, h: ResponseToolkit) {
    const user = request.plugins['user'];
    const role = user?.role;

    if (role !== 'hr' && role !== 'director') {
      return h.response({ message: 'Unauthorized' }).code(403);
    }

    const leaveDetails = await leaveDetailRepo.find({
      relations: ['employee', 'leaveType'],
    });

    const grouped: Record<string, any> = {};

    for (const detail of leaveDetails) {
      const emp = detail.employee;
      const leaveInfo = {
        leaveType: detail.leaveType.type,
        allocated: detail.allocated,
        used: detail.used,
        remaining: detail.remaining,
      };

      if (!grouped[emp.id]) {
        grouped[emp.id] = {
          employee: {
            id: emp.id,
            fullName: emp.fullName,
            email: emp.email,
          },
          leaveDetails: [leaveInfo],
        };
      } else {
        grouped[emp.id].leaveDetails.push(leaveInfo);
      }
    }

    return h.response(Object.values(grouped)).code(200);
  }
}
