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

    if (role === 'director' && managerEmail) {
      return h.response({ message: 'Director should not have a manager.' }).code(400);
    }

    // await this.getEmail(email);

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
    const employee = await empRepo.findOne({ where: { email, isDeleted: false } });
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
    const employees = await empRepo.find({ relations: ['manager'], where: { isDeleted: false } });
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
    const res = await empRepo.findOne({ where: { email: email,isDeleted:false } })
  }
  async getEmpByEmail(request: Request, h: ResponseToolkit) {
    const user = request?.plugins['user'];
    if (user.role != 'hr') {
      return h.response({ message: "Unauthorized" }).code(401);
    }
    const { email } = request.params as any;
    const res = await empRepo.findOne({ where: { email: email,isDeleted:false }, relations: ['manager'] })
    if (!res) {
      return h.response({ message: "No user found" }).code(404);
    }
    const data = {
      id: res.id,
      email: res.email,
      fullName: res.fullName,
      role: res.role,
      manager: res.manager ? {
        id: res.manager.id,
        fullName: res.manager.fullName,
        email: res.manager.email,
      } : undefined
    }
    return h.response(data).code(200);
  }
  async getEmployee(request: Request, h: ResponseToolkit) {
    const user = request?.plugins['user']
    const res = await empRepo.findOne({ where: { id: user.id,isDeleted:false }, relations: ['manager'] });
    const data: any = {
      id: res.id,
      email: res.email,
      fullName: res.fullName,
      role: res.role,
      isManager: res.isManager,
      createdAt: res.createdAt,
    };
    if(!res){
      return h.response({message:"User not found"}).code(404)
    }
    return h.response(data).code(200)
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
    try {
      const user = request.plugins['user'];
      const res = await empRepo.findOne({ where: { id: user.id,isDeleted:false } });
      const { currentPassword, newPassword } = request.payload as any;
      const isPassword = await bcrypt.compare(currentPassword, res.password);
      if (!isPassword) {
        return h.response({ message: "Current password is incorrect" }).code(400);
      }
      const isSame = await bcrypt.compare(newPassword, res.password);
      if (isSame) {
        return h.response({ message: "New password cannot be the same as the current password" }).code(400);
      }
      const newHashed = await bcrypt.hash(newPassword, 10);
      res.password = newHashed;
      await empRepo.save(res);
      return h.response({ message: "Password changed successfully" }).code(200);
    } catch (error) {
      console.error(error);
      return h.response({ message: "An error occurred while updating the password" }).code(500);
    }
  }


  async updateEmployee(request: Request, h: ResponseToolkit) {
    const user = request.plugins['user'];
    if (user.role !== 'hr') {
      return h.response({ message: 'Unauthorized' }).code(401);
    }

    const { email, fullName, role, password, managerEmail }: any = request.payload;
    console.log('Updating employee:', { email, fullName, role, password, managerEmail });

    const employee = await empRepo.findOne({ where: { email,isDeleted:false } });
    if (!employee) {
      return h.response({ message: 'Employee not found' }).code(404);
    }

    if (role === 'director' && managerEmail) {
      return h.response({ message: 'Director should not have a manager.' }).code(400);
    }

    employee.fullName = fullName ?? employee.fullName;
    employee.role = role ?? employee.role;

    if (password) {
      employee.password = await bcrypt.hash(password, 10);
    }

    if (managerEmail) {
      const manager = await empRepo.findOne({ where: { email: managerEmail } });
      if (!manager) {
        return h.response({ message: 'Manager not found' }).code(400);
      }

      employee.manager = manager;

      if (!manager.isManager) {
        manager.isManager = true;
        await empRepo.save(manager);
      }
    } else {
      employee.manager = null;
    }

    try {
      const updatedEmp = await empRepo.save(employee);
      console.log('Updated employee:', updatedEmp);
      return h.response({ message: 'Employee updated successfully' }).code(200);
    } catch (err) {
      console.error('Error updating employee:', err);
      return h.response({ message: 'Failed to update employee', error: err.message }).code(500);
    }
  }

  async deleteOrRestore(request: Request, h: ResponseToolkit) {
    const user = request?.plugins['user'];
    if (user.role != 'hr') {
      return h.response({ message: "Unauthorized" }).code(401);
    }
    const { email, action } = request.payload as any;
    const emp = await empRepo.findOne({ where: { email } });
    const message: any = {}
    if (action == 'hardDelete') {
      const deleted = await empRepo.delete(emp.id);
      if(!deleted.affected){
        return h.response({ message: "Deletion failed" }).code(404);
      }
      return h.response({ message: "Employee deleted successfully" }).code(200)
    }
    else if (action == 'softDelete') {
      emp.isDeleted = true;
      message.message = "Employee moved to bin"
    }
    else if (action == 'restore') {
      emp.isDeleted = false;
      message.message = "Employee restored successfully"
    }
    else {
      message.message = "Invalid action"
    }
    await empRepo.save(emp)
    return h.response({ ...message }).code(200)
  }

  async getIsDeletedEmployee(request: Request, h: ResponseToolkit) {
    const user = request?.plugins['user'];
    if (user.role != 'hr') {
      return h.response({ message: "Unauthorized" }).code(401);
    }
    const employees = await empRepo.find({ where: { isDeleted: true } });
    const res = employees.map((emp)=>{
      return {
        id:emp.id,
        fullName:emp.fullName,
        email:emp.email,
      }
    })
    return h.response({ res, message: "Employees get successfully" })
  }

  async reassignManager(request: Request, h: ResponseToolkit) {
    const user = request.plugins['user'];
    if (user.role !== 'hr') {
      return h.response({ message: 'Unauthorized' }).code(401);
    }

    const { managerEmail, newManagerEmail } = request.payload as { managerEmail: string, newManagerEmail: string };

    if (managerEmail === newManagerEmail) {
      return h.response({ message: 'Both emails are the same. No reassignment needed.' }).code(400);
    }

    const oldManager = await empRepo.findOne({ where: { email: managerEmail, isDeleted: false } });
    const newManager = await empRepo.findOne({ where: { email: newManagerEmail, isDeleted: false } });

    if (!oldManager || !newManager) {
      return h.response({ message: 'One or both manager accounts not found or are deleted.' }).code(404);
    }

    const employeesUnderOldManager = await empRepo.find({
      where: {
        manager: { id: oldManager.id },
      },
    });

    if (employeesUnderOldManager.length === 0) {
      return h.response({ message: 'No active employees found under the current manager.' }).code(400);
    }

    const updatedEmployees = employeesUnderOldManager.map(emp => {
      emp.manager = newManager;
      return emp;
    });

    await empRepo.save(updatedEmployees);

    const remainingUnderOldManager = await empRepo.find({
      where: {
        manager: { id: oldManager.id },
        isDeleted: false,
      },
    });

    oldManager.isManager = remainingUnderOldManager.length > 0;
    newManager.isManager = true;

    await empRepo.save([oldManager, newManager]);

    return h.response({ message: 'Employees reassigned to new manager successfully.' }).code(200);
  }

}
