import { Request, ResponseToolkit } from '@hapi/hapi';
import { Employee } from './users';
import { dataSource } from '../../db/database';
import { LeaveType } from '../leaveTypes/leaveType';
import { LeaveDetail } from '../leaveDetails/leaveDetail';
import bcrypt = require('bcrypt');
import jwt = require('jsonwebtoken');



const empRepo = dataSource.getRepository(Employee);
const leaveTypeRepo = dataSource.getRepository(LeaveType);
const leaveDetailRepo = dataSource.getRepository(LeaveDetail);

export class EmployeeServices {
  async createEmployee(request: Request, h: ResponseToolkit) {
    const user = request.plugins['user'];
    if (user.role != 'hr') {
      return h.response({ message: 'access denied , unautherized' }).code(401)
    }
    const { email, password, fullName, role, managerEmail }: any = request.payload;
    console.log({ email, password, fullName, role, managerEmail });

    if (role === 'director' && managerEmail) {
      return h.response({ message: 'Director should not have a manager.' }).code(400);
    }

    await this.getEmail(email);

    const hashedPassword = await bcrypt.hash(password, 10);
    const employee = new Employee();
    employee.email = email;
    employee.password = hashedPassword;
    employee.fullName = fullName;
    employee.role = role || 'employee';

    if (managerEmail) {
      const manager = await empRepo.findOne({ where: { email: managerEmail } });
      if (!manager) return h.response({ message: 'Manager not found' }).code(400);
      employee.manager = manager;
      if (!manager.isManager) {
        manager.isManager = true;
        await empRepo.save(manager);
      }
    }


    try {
      const savedEmployee = await empRepo.save(employee);
      console.log('Saved Employee:', savedEmployee);

      const leaveTypes = await leaveTypeRepo.find();
      for (const type of leaveTypes) {
        const detail = new LeaveDetail();
        detail.employee = savedEmployee;
        detail.leaveType = type;
        detail.allocated = type.maxLeave ?? 0;
        detail.used = 0;
        detail.remaining = type.maxLeave ?? 0;
        console.log(`Creating leave detail for ${type.type}`);
        await leaveDetailRepo.save(detail);
      }

      return h.response({ message: 'Employee created successfully' }).code(201);
    } catch (err) {
      console.error('Error saving employee:', err);
      return h.response({ message: 'Failed to save employee', error: err.message }).code(500);
    }
  }


  async login(request: Request, h: ResponseToolkit) {
    const { email, password } = request.payload as any;
    const employee = await empRepo.findOne({ where: { email } });
    console.log(employee.id)
    if (!employee || !(await bcrypt.compare(password, employee.password))) {
      return h.response({ message: 'Invalid email or password' }).code(401);
    }

    const token = jwt.sign(
      { id: employee.id, role: employee.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    return h
      .response({ message: 'Login successful' })
      .state('auth_token', token, {
        isHttpOnly: true,
        isSecure: true,
        isSameSite: 'None',
        path: '/',
        ttl: 60 * 60 * 1000,
      });
  }

  async getEmplyeesByManager(request: Request, h: ResponseToolkit) {
    const employees = await empRepo.find({ relations: ['manager'] });
    const user = request?.plugins['user']
    console.log(user)
    let result = employees.filter((emp) => emp.manager != null && emp.manager.id == user.id)
    const results = result.map((emp) => ({
      id: emp.id,
      email: emp.email,
      fullName: emp.fullName,
      role: emp.role,
      manager: {
        id: emp.manager.id,
        fullName: emp.manager.fullName,
        email: emp.manager.email,
      }
    }));
    return h.response(results).code(200)
  }


  async getAllEmployees(request: Request, h: ResponseToolkit) {
    const employees = await empRepo.find({ relations: ['manager'] });
    const result = employees.map((emp) => ({
      email: emp.email,
      fullName: emp.fullName,
      role: emp.role,
      managerEmail: emp.manager?.email || null,
    }));
    return h.response(result).code(200);
  }

  async getEmail(email: string) {
    const res = await empRepo.findOne({ where: { email: email } })
  }
  async getEmployee(request: Request, h: ResponseToolkit) {
    const user = request?.plugins['user']
    const res = await empRepo.findOne({ where: { id: user.id }, relations: ['manager'] });
    console.log(res)
    const data = {
      id: res.id,
      email: res.email,
      fullName: res.fullName,
      role: res.role,
      isManager: res.isManager,
      createdAt: res.createdAt,
      manager: {
        managerEmail: res.manager.email,
        managerName: res.manager.fullName
      }
    }
    return h.response(data)
  }

  async logout(request: Request, h: ResponseToolkit) {
    return h
      .response({ message: 'Logout successful' })
      .unstate('auth_token', {
        isHttpOnly: true,
        isSecure: true,
        isSameSite: 'None',
        path: '/',
      }).code(200);
  }

  async checkAuthState(request: Request, h: ResponseToolkit) {
    const token = request.state.auth_token;

    if (!token) {
      return h.response().code(204);
    }

    return h.response({ message: 'Auth token is present', token }).code(200);
  }


  async updatePassword(request: Request, h: ResponseToolkit) {
    const user = request.plugins['user']
    const res = await empRepo.findOne({ where: { id: user.id } })
    const { currentPassword, newPassword } = request.payload as any;
    const isPassword = await bcrypt.compare(currentPassword, res.password);
    const isSame = await bcrypt.compare(newPassword, res.password);
    if (isSame) {
      return h.response({ message: "Current password wrong" })
    }
    if (!isPassword) {
      return h.response({ message: "New password and current password can't be same" })
    }
    const newHashed = await bcrypt.hash(newPassword,10)
    res.password = newHashed;
    await empRepo.save(res)
    return h.response({ message: "Password changed successfully" }).code(200)
  }
}
