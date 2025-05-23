import { ServerRoute } from '@hapi/hapi';
import { LeaveDetailService } from './leaveDetailsService';
import { authenticate } from '../../utils/authenticate';
const leaveDetailService = new LeaveDetailService();



export const leaveDetailsController: ServerRoute[] = [
  {
    method: 'GET',
    path: '/api/v1/leave-details/me',
    handler: leaveDetailService.getMyLeaveDetails,
    options: {
      pre: [authenticate], // your custom auth logic
    },
  },
  {
    method: 'GET',
    path: '/api/v1/leave-details/subordinates',
    handler: leaveDetailService.getSubordinatesLeaveDetails,
    options: {
      pre: [authenticate],
    },
  },
  {
    method: 'GET',
    path: '/api/v1/leave-details/all',
    handler: leaveDetailService.getAllEmployeeLeaveDetails,
    options: {
      pre: [authenticate],
    },
  }
];
