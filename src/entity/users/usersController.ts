import { ServerRoute } from '@hapi/hapi';
import { EmployeeServices } from './userServices';
import Joi from 'joi';
import { authenticate } from '../../utils/authenticate';

const employeeServices = new EmployeeServices();

export const userController: ServerRoute[] = [
  {
    method: 'POST',
    path: '/api/v1/user',
    handler: employeeServices.createEmployee.bind(employeeServices),
    options: {
      description: 'Create new employee',
      tags: ['api', 'employee'],
      validate: {
        payload: Joi.object({
          email: Joi.string().email().required(),
          password: Joi.string().min(8).required(),
          fullName: Joi.string().required(),
          role: Joi.string().valid('employee', 'manager', 'hr', 'director').optional(),
          managerEmail: Joi.string().email().optional().allow(null, ''),
        }),
      },
    },
  },
  {
    method: 'POST',
    path: '/api/v1/login',
    handler: employeeServices.login.bind(employeeServices),
    options: {
      description: 'Login and return auth token in cookie',
      tags: ['api', 'auth'],
      validate: {
        payload: Joi.object({
          email: Joi.string().email().required(),
          password: Joi.string().required(),
        }),
      },
    },
  },
  {
    method: 'GET',
    path: '/api/v1/employees',
    handler: employeeServices.getAllEmployees.bind(employeeServices),
    options: {
      description: 'Get all employees',
      tags: ['api', 'employee'],
    },
  },
  {
    method :'GET',
    path:'/api/v1/employeeByManager',
    options:{pre:[authenticate]},
    handler:employeeServices.getEmplyeesByManager.bind(employeeServices),
  },
  {
    method :'GET',
    path:'/api/v1/me',
    options:{pre:[authenticate]},
    handler:employeeServices.getEmployee.bind(employeeServices),
  },
];
