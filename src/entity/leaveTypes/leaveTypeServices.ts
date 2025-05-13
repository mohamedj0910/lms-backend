import { Request, ResponseToolkit } from '@hapi/hapi';
import { LeaveType } from './leaveType';
import { dataSource } from '../../db/database';

const leaveTypeRepo = dataSource.getRepository(LeaveType);

export class LeaveTypeServices {
  async addLeaveType(request: Request, h: ResponseToolkit) {
    const { type, maxLeave } = request.payload as { type: string; maxLeave: number };

    const existing = await leaveTypeRepo.findOne({ where: { type } });
    if (existing) {
      return h.response({ message: 'Leave type already exists' }).code(400);
    }

    const leaveType = new LeaveType();
    leaveType.type = type;
    leaveType.maxLeave = maxLeave;

    await leaveTypeRepo.save(leaveType);
    return h.response({ message: 'Leave type added successfully' }).code(201);
  }
}
