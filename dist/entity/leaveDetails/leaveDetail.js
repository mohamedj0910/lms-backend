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
exports.LeaveDetail = void 0;
const typeorm_1 = require("typeorm");
const users_1 = require("../users/users");
const leaveType_1 = require("../leaveTypes/leaveType");
let LeaveDetail = class LeaveDetail {
};
exports.LeaveDetail = LeaveDetail;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], LeaveDetail.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => users_1.Employee, (employee) => employee.leaveDetails, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'employeeId' }),
    __metadata("design:type", users_1.Employee)
], LeaveDetail.prototype, "employee", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => leaveType_1.LeaveType, (type) => type.leaveDetails, { eager: true, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'leaveTypeId' }),
    __metadata("design:type", leaveType_1.LeaveType)
], LeaveDetail.prototype, "leaveType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], LeaveDetail.prototype, "allocated", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], LeaveDetail.prototype, "used", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], LeaveDetail.prototype, "remaining", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], LeaveDetail.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], LeaveDetail.prototype, "updatedAt", void 0);
exports.LeaveDetail = LeaveDetail = __decorate([
    (0, typeorm_1.Entity)()
], LeaveDetail);
