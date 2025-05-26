"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeServices = void 0;
const users_1 = require("./users");
const database_1 = require("../../db/database");
const leaveType_1 = require("../leaveTypes/leaveType");
const leaveDetail_1 = require("../leaveDetails/leaveDetail");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const empRepo = database_1.dataSource.getRepository(users_1.Employee);
const leaveTypeRepo = database_1.dataSource.getRepository(leaveType_1.LeaveType);
const leaveDetailRepo = database_1.dataSource.getRepository(leaveDetail_1.LeaveDetail);
class EmployeeServices {
    createEmployee(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const user = request.plugins['user'];
            if (user.role != 'hr') {
                return h.response({ message: 'access denied , unautherized' }).code(401);
            }
            const { email, password, fullName, role, managerEmail } = request.payload;
            if (role === 'director' && managerEmail) {
                return h.response({ message: 'Director should not have a manager.' }).code(400);
            }
            // await this.getEmail(email);
            const hashedPassword = yield bcrypt.hash(password, 10);
            const employee = new users_1.Employee();
            employee.email = email;
            employee.password = hashedPassword;
            employee.fullName = fullName;
            employee.role = role || 'employee';
            if (managerEmail) {
                const manager = yield empRepo.findOne({ where: { email: managerEmail } });
                if (!manager)
                    return h.response({ message: 'Manager not found' }).code(400);
                employee.manager = manager;
                if (!manager.isManager) {
                    manager.isManager = true;
                    yield empRepo.save(manager);
                }
            }
            try {
                const savedEmployee = yield empRepo.save(employee);
                console.log('Saved Employee:', savedEmployee);
                const leaveTypes = yield leaveTypeRepo.find();
                for (const type of leaveTypes) {
                    const detail = new leaveDetail_1.LeaveDetail();
                    detail.employee = savedEmployee;
                    detail.leaveType = type;
                    detail.allocated = (_a = type.maxLeave) !== null && _a !== void 0 ? _a : 0;
                    detail.used = 0;
                    detail.remaining = (_b = type.maxLeave) !== null && _b !== void 0 ? _b : 0;
                    console.log(`Creating leave detail for ${type.type}`);
                    yield leaveDetailRepo.save(detail);
                }
                return h.response({ message: 'Employee created successfully' }).code(201);
            }
            catch (err) {
                console.error('Error saving employee:', err);
                return h.response({ message: 'Failed to save employee', error: err.message }).code(500);
            }
        });
    }
    login(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, password } = request.payload;
            const employee = yield empRepo.findOne({ where: { email, isDeleted: false } });
            if (!employee || !(yield bcrypt.compare(password, employee.password))) {
                return h.response({ message: 'Invalid email or password' }).code(401);
            }
            const token = jwt.sign({ id: employee.id, role: employee.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
            return h
                .response({ message: 'Login successful' })
                .state('auth_token', token, {
                isHttpOnly: true,
                isSecure: true,
                isSameSite: 'None',
                path: '/',
                ttl: 60 * 60 * 1000,
            });
        });
    }
    getEmplyeesByManager(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const employees = yield empRepo.find({ relations: ['manager'], where: { isDeleted: false } });
            const user = request === null || request === void 0 ? void 0 : request.plugins['user'];
            console.log(user);
            let result = employees.filter((emp) => emp.manager != null && emp.manager.id == user.id);
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
            return h.response(results).code(200);
        });
    }
    getAllEmployees(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const employees = yield empRepo.find({ relations: ['manager'] });
            const result = employees.map((emp) => {
                var _a;
                return ({
                    email: emp.email,
                    fullName: emp.fullName,
                    role: emp.role,
                    managerEmail: ((_a = emp.manager) === null || _a === void 0 ? void 0 : _a.email) || null,
                });
            });
            return h.response(result).code(200);
        });
    }
    getEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield empRepo.findOne({ where: { email: email, isDeleted: false } });
        });
    }
    getEmpByEmail(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = request === null || request === void 0 ? void 0 : request.plugins['user'];
            if (user.role != 'hr') {
                return h.response({ message: "Unauthorized" }).code(401);
            }
            const { email } = request.params;
            const res = yield empRepo.findOne({ where: { email: email, isDeleted: false }, relations: ['manager'] });
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
            };
            return h.response(data).code(200);
        });
    }
    getEmployee(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = request === null || request === void 0 ? void 0 : request.plugins['user'];
            const res = yield empRepo.findOne({ where: { id: user.id, isDeleted: false }, relations: ['manager'] });
            const data = {
                id: res.id,
                email: res.email,
                fullName: res.fullName,
                role: res.role,
                isManager: res.isManager,
                createdAt: res.createdAt,
            };
            if (!res) {
                return h.response({ message: "User not found" }).code(404);
            }
            return h.response(data).code(200);
        });
    }
    logout(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            return h
                .response({ message: 'Logout successful' })
                .unstate('auth_token', {
                isHttpOnly: true,
                isSecure: true,
                isSameSite: 'None',
                path: '/',
            }).code(200);
        });
    }
    checkAuthState(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = request.state.auth_token;
            if (!token) {
                return h.response().code(204);
            }
            return h.response({ message: 'Auth token is present', token }).code(200);
        });
    }
    updatePassword(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = request.plugins['user'];
                const res = yield empRepo.findOne({ where: { id: user.id, isDeleted: false } });
                const { currentPassword, newPassword } = request.payload;
                const isPassword = yield bcrypt.compare(currentPassword, res.password);
                if (!isPassword) {
                    return h.response({ message: "Current password is incorrect" }).code(400);
                }
                const isSame = yield bcrypt.compare(newPassword, res.password);
                if (isSame) {
                    return h.response({ message: "New password cannot be the same as the current password" }).code(400);
                }
                const newHashed = yield bcrypt.hash(newPassword, 10);
                res.password = newHashed;
                yield empRepo.save(res);
                return h.response({ message: "Password changed successfully" }).code(200);
            }
            catch (error) {
                console.error(error);
                return h.response({ message: "An error occurred while updating the password" }).code(500);
            }
        });
    }
    updateEmployee(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = request.plugins['user'];
            if (user.role !== 'hr') {
                return h.response({ message: 'Unauthorized' }).code(401);
            }
            const { email, fullName, role, password, managerEmail } = request.payload;
            console.log('Updating employee:', { email, fullName, role, password, managerEmail });
            const employee = yield empRepo.findOne({ where: { email, isDeleted: false } });
            if (!employee) {
                return h.response({ message: 'Employee not found' }).code(404);
            }
            if (role === 'director' && managerEmail) {
                return h.response({ message: 'Director should not have a manager.' }).code(400);
            }
            employee.fullName = fullName !== null && fullName !== void 0 ? fullName : employee.fullName;
            employee.role = role !== null && role !== void 0 ? role : employee.role;
            if (password) {
                employee.password = yield bcrypt.hash(password, 10);
            }
            if (managerEmail) {
                const manager = yield empRepo.findOne({ where: { email: managerEmail } });
                if (!manager) {
                    return h.response({ message: 'Manager not found' }).code(400);
                }
                employee.manager = manager;
                if (!manager.isManager) {
                    manager.isManager = true;
                    yield empRepo.save(manager);
                }
            }
            else {
                employee.manager = null;
            }
            try {
                const updatedEmp = yield empRepo.save(employee);
                console.log('Updated employee:', updatedEmp);
                return h.response({ message: 'Employee updated successfully' }).code(200);
            }
            catch (err) {
                console.error('Error updating employee:', err);
                return h.response({ message: 'Failed to update employee', error: err.message }).code(500);
            }
        });
    }
    deleteOrRestore(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = request === null || request === void 0 ? void 0 : request.plugins['user'];
            if (user.role != 'hr') {
                return h.response({ message: "Unauthorized" }).code(401);
            }
            const { email, action } = request.payload;
            const emp = yield empRepo.findOne({ where: { email } });
            const message = {};
            if (action == 'hardDelete') {
                const deleted = yield empRepo.delete(emp.id);
                if (!deleted.affected) {
                    return h.response({ message: "Deletion failed" }).code(404);
                }
                return h.response({ message: "Employee deleted successfully" }).code(200);
            }
            else if (action == 'softDelete') {
                emp.isDeleted = true;
                message.message = "Employee moved to bin";
            }
            else if (action == 'restore') {
                emp.isDeleted = false;
                message.message = "Employee restored successfully";
            }
            else {
                message.message = "Invalid action";
            }
            yield empRepo.save(emp);
            return h.response(Object.assign({}, message)).code(200);
        });
    }
    getIsDeletedEmployee(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = request === null || request === void 0 ? void 0 : request.plugins['user'];
            if (user.role != 'hr') {
                return h.response({ message: "Unauthorized" }).code(401);
            }
            const employees = yield empRepo.find({ where: { isDeleted: true } });
            const res = employees.map((emp) => {
                return {
                    id: emp.id,
                    fullName: emp.fullName,
                    email: emp.email,
                };
            });
            return h.response({ res, message: "Employees get successfully" });
        });
    }
    reassignManager(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = request.plugins['user'];
            if (user.role !== 'hr') {
                return h.response({ message: 'Unauthorized' }).code(401);
            }
            const { managerEmail, newManagerEmail } = request.payload;
            if (managerEmail === newManagerEmail) {
                return h.response({ message: 'Both emails are the same. No reassignment needed.' }).code(400);
            }
            const oldManager = yield empRepo.findOne({ where: { email: managerEmail, isDeleted: false } });
            const newManager = yield empRepo.findOne({ where: { email: newManagerEmail, isDeleted: false } });
            if (!oldManager || !newManager) {
                return h.response({ message: 'One or both manager accounts not found or are deleted.' }).code(404);
            }
            const employeesUnderOldManager = yield empRepo.find({
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
            yield empRepo.save(updatedEmployees);
            const remainingUnderOldManager = yield empRepo.find({
                where: {
                    manager: { id: oldManager.id },
                    isDeleted: false,
                },
            });
            oldManager.isManager = remainingUnderOldManager.length > 0;
            newManager.isManager = true;
            yield empRepo.save([oldManager, newManager]);
            return h.response({ message: 'Employees reassigned to new manager successfully.' }).code(200);
        });
    }
}
exports.EmployeeServices = EmployeeServices;
