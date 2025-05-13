import { ServerRoute } from '@hapi/hapi';
import Joi from 'joi';
import { authenticate } from '../../utils/authenticate';
import { LeaveServices } from './leaveServices';

const leaveService = new LeaveServices();

export const leaveReqController: ServerRoute[] = [
  // Create leave request
  {
    method: 'POST',
    path: '/api/v1/leave-request',
    handler: leaveService.createLeaveRequest.bind(leaveService),
    options: {
      pre: [authenticate],
      validate: {
        payload: Joi.object({
          startDate: Joi.date().required(),
          endDate: Joi.date().required(),
          reason: Joi.string().required(),
          leaveTypeName: Joi.string().required(),
        }),
      },
    },
  },

  // My leave requests
  {
    method: 'GET',
    path: '/api/v1/leave-requests/myreqs',
    handler: leaveService.getMyLeaveRequests.bind(leaveService),
    options: { pre: [authenticate] },
  },

  // Manager: Subordinates’ pending requests
  {
    method: 'GET',
    path: '/api/v1/leave-requests/manager/pending',
    handler: leaveService.getPendingSubordinateRequests.bind(leaveService),
    options: { pre: [authenticate] },
  },

  // HR: Pending approvals
  {
    method: 'GET',
    path: '/api/v1/leave-requests/hr/pending',
    handler: leaveService.getPendingHRApprovals.bind(leaveService),
    options: { pre: [authenticate] },
  },

  // Director: Pending approvals
  {
    method: 'GET',
    path: '/api/v1/leave-requests/director/pending',
    handler: leaveService.getPendingDirectorApprovals.bind(leaveService),
    options: { pre: [authenticate] },
  },

  // Cancel leave
  {
    method: 'PATCH',
    path: '/api/v1/leave-requests/cancel/{id}',
    handler: leaveService.cancelLeaveRequest.bind(leaveService),
    options: {
      pre: [authenticate],
      validate: {
        params: Joi.object({
          id: Joi.string().uuid().required(),
        }),
      },
    },
  },
];
