"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = void 0;
const userServices_1 = require("./userServices");
const joi_1 = __importDefault(require("joi"));
const authenticate_1 = require("../../utils/authenticate");
const employeeServices = new userServices_1.EmployeeServices();
exports.userController = [
    {
        method: 'POST',
        path: '/api/v1/user',
        handler: employeeServices.createEmployee.bind(employeeServices),
        options: {
            pre: [authenticate_1.authenticate],
            description: 'Create new employee',
            tags: ['api', 'employee'],
            validate: {
                payload: joi_1.default.object({
                    email: joi_1.default.string().email().required(),
                    password: joi_1.default.string().min(8).required(),
                    fullName: joi_1.default.string().required(),
                    role: joi_1.default.string().valid('employee', 'manager', 'hr', 'director').optional(),
                    managerEmail: joi_1.default.string().email().optional().allow(null, ''),
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
                payload: joi_1.default.object({
                    email: joi_1.default.string().email().required(),
                    password: joi_1.default.string().required(),
                }),
            },
        },
    },
    {
        method: 'GET',
        path: '/api/v1/employees',
        handler: employeeServices.getAllEmployees.bind(employeeServices),
        options: {
            pre: [authenticate_1.authenticate],
            description: 'Get all employees',
            tags: ['api', 'employee'],
        },
    },
    {
        method: 'GET',
        path: '/api/v1/employeeByManager',
        options: { pre: [authenticate_1.authenticate] },
        handler: employeeServices.getEmplyeesByManager.bind(employeeServices),
    },
    {
        method: 'GET',
        path: '/api/v1/me',
        options: { pre: [authenticate_1.authenticate] },
        handler: employeeServices.getEmployee.bind(employeeServices),
    },
    {
        method: 'POST',
        path: '/api/v1/logout',
        options: {
            pre: [authenticate_1.authenticate],
            description: 'Logout user',
            tags: ['api', 'auth'],
        },
        handler: employeeServices.logout.bind(employeeServices),
    },
    {
        method: 'GET',
        path: '/api/v1/checkAuth',
        options: { pre: [authenticate_1.authenticate] },
        handler: employeeServices.checkAuthState.bind(employeeServices)
    }
];
