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
exports.LeaveTypeServices = void 0;
const leaveType_1 = require("./leaveType");
const database_1 = require("../../db/database");
const leaveTypeRepo = database_1.dataSource.getRepository(leaveType_1.LeaveType);
class LeaveTypeServices {
    addLeaveType(request, h) {
        return __awaiter(this, void 0, void 0, function* () {
            const { type, maxLeave } = request.payload;
            const existing = yield leaveTypeRepo.findOne({ where: { type } });
            if (existing) {
                return h.response({ message: 'Leave type already exists' }).code(400);
            }
            const leaveType = new leaveType_1.LeaveType();
            leaveType.type = type;
            leaveType.maxLeave = maxLeave;
            yield leaveTypeRepo.save(leaveType);
            return h.response({ message: 'Leave type added successfully' }).code(201);
        });
    }
}
exports.LeaveTypeServices = LeaveTypeServices;
