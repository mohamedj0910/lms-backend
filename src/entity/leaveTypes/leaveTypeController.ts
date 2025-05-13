import { ServerRoute } from '@hapi/hapi';
import Joi from 'joi';
import { authenticate } from '../../utils/authenticate';
import { LeaveTypeServices } from './leaveTypeServices';

const leaveTypeService = new LeaveTypeServices();

export const leaveTypeController: ServerRoute[] = [
  {
    method: 'POST',
    path: '/api/v1/leave-types',
    handler: leaveTypeService.addLeaveType.bind(leaveTypeService),
    options: {
      pre: [authenticate],
      validate: {
        payload: Joi.object({
          type: Joi.string().required(),
          maxLeave: Joi.number().positive().required(),
        }),
      },
    },
  },
];
