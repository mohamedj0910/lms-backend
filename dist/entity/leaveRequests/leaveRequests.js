"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveRequest = void 0;
const typeorm_1 = require("typeorm");
const users_1 = require("../users/users");
const leaveType_1 = require("../leaveTypes/leaveType");
const approvals_1 = require("../approvals/approvals");
let LeaveRequest = class LeaveRequest {
};
exports.LeaveRequest = LeaveRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], LeaveRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => users_1.Employee, (employee) => employee.leaveRequests),
    (0, typeorm_1.JoinColumn)({ name: 'employeeId' }),
    __metadata("design:type", users_1.Employee)
], LeaveRequest.prototype, "employee", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => leaveType_1.LeaveType),
    (0, typeorm_1.JoinColumn)({ name: 'leaveTypeId' }),
    __metadata("design:type", leaveType_1.LeaveType)
], LeaveRequest.prototype, "leaveType", void 0);
__decorate([
    (0, typeorm_1.Column)('date'),
    __metadata("design:type", String)
], LeaveRequest.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)('date'),
    __metadata("design:type", String)
], LeaveRequest.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], LeaveRequest.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)('int'),
    __metadata("design:type", Number)
], LeaveRequest.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], LeaveRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], LeaveRequest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => approvals_1.Approval, approval => approval.leaveRequest, { cascade: true }),
    __metadata("design:type", approvals_1.Approval)
], LeaveRequest.prototype, "approval", void 0);
exports.LeaveRequest = LeaveRequest = __decorate([
    (0, typeorm_1.Entity)()
], LeaveRequest);
