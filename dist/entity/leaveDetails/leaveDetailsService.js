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
exports.LeaveDetailService = void 0;
const database_1 = require("../../db/database");
const leaveDetail_1 = require("./leaveDetail");
const users_1 = require("../users/users");
const typeorm_1 = require("typeorm");
const leaveDetailRepo = database_1.dataSource.getRepository(leaveDetail_1.LeaveDetail);
const empRepo = database_1.dataSource.getRepository(users_1.Employee);
class LeaveDetailService {
    // 1. Get own leave details (for any user)
    getMyLeaveDetails(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const user = request.plugins['user'];
            const userId = user === null || user === void 0 ? void 0 : user.id;
            if (!userId) {
                return h.response({ message: 'Unauthorized' }).code(401);
            }
            const leaveDetails = yield leaveDetailRepo.find({
                where: { employee: { id: userId } },
                relations: ['employee', 'leaveType'],
            });
            const formatted = leaveDetails.map((detail) => ({
                leaveType: detail.leaveType.type,
                allocated: detail.allocated,
                used: detail.used,
                remaining: detail.remaining,
            }));
            return h.response({
                employee: {
                    id: (_a = leaveDetails[0]) === null || _a === void 0 ? void 0 : _a.employee.id,
                    fullName: (_b = leaveDetails[0]) === null || _b === void 0 ? void 0 : _b.employee.fullName,
                    email: (_c = leaveDetails[0]) === null || _c === void 0 ? void 0 : _c.employee.email,
                },
                leaveDetails: formatted,
            }).code(200);
        });
    }
    // 2. Manager view of subordinates' leave details
    getSubordinatesLeaveDetails(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = request.plugins['user'];
            const userId = user === null || user === void 0 ? void 0 : user.id;
            const userRole = user === null || user === void 0 ? void 0 : user.role;
            if (!userId || userRole !== 'manager') {
                return h.response({ message: 'Unauthorized or Forbidden' }).code(403);
            }
            const subordinates = yield empRepo.find({
                where: { manager: { id: userId } },
            });
            const subordinateIds = subordinates.map((emp) => emp.id);
            if (subordinateIds.length === 0) {
                return h.response([]).code(200);
            }
            const leaveDetails = yield leaveDetailRepo.find({
                where: { employee: { id: (0, typeorm_1.In)(subordinateIds) } },
                relations: ['employee', 'leaveType'],
            });
            const grouped = {};
            for (const detail of leaveDetails) {
                const emp = detail.employee;
                const leaveInfo = {
                    leaveType: detail.leaveType.type,
                    allocated: detail.allocated,
                    used: detail.used,
                    remaining: detail.remaining,
                };
                if (!grouped[emp.id]) {
                    grouped[emp.id] = {
                        employee: {
                            id: emp.id,
                            fullName: emp.fullName,
                            email: emp.email,
                        },
                        leaveDetails: [leaveInfo],
                    };
                }
                else {
                    grouped[emp.id].leaveDetails.push(leaveInfo);
                }
            }
            return h.response(Object.values(grouped)).code(200);
        });
    }
    // 3. HR or Director view of all employees' leave details
    getAllEmployeeLeaveDetails(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = request.plugins['user'];
            const role = user === null || user === void 0 ? void 0 : user.role;
            if (role !== 'hr' && role !== 'director') {
                return h.response({ message: 'Unauthorized' }).code(403);
            }
            const leaveDetails = yield leaveDetailRepo.find({
                relations: ['employee', 'leaveType'],
            });
            const grouped = {};
            for (const detail of leaveDetails) {
                const emp = detail.employee;
                const leaveInfo = {
                    leaveType: detail.leaveType.type,
                    allocated: detail.allocated,
                    used: detail.used,
                    remaining: detail.remaining,
                };
                if (!grouped[emp.id]) {
                    grouped[emp.id] = {
                        employee: {
                            id: emp.id,
                            fullName: emp.fullName,
                            email: emp.email,
                        },
                        leaveDetails: [leaveInfo],
                    };
                }
                else {
                    grouped[emp.id].leaveDetails.push(leaveInfo);
                }
            }
            return h.response(Object.values(grouped)).code(200);
        });
    }
}
exports.LeaveDetailService = LeaveDetailService;
