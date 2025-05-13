import { ServerRoute } from '@hapi/hapi';
import Joi from 'joi';
import { authenticate } from '../../utils/authenticate';
import { ApprovalServices } from './approvalServices';

const approvalService = new ApprovalServices();

export const approvalController: ServerRoute[] = [
  {
    method: 'PATCH',
    path: '/api/v1/approvals/{id}',
    handler: approvalService.updateApproval.bind(approvalService),
    options: {
      pre: [authenticate],
      validate: {
        params: Joi.object({ id: Joi.string().required() }),
        payload: Joi.object({
          status: Joi.string().valid('approved', 'rejected').required(),
        }),
      },
    },
  },
];
