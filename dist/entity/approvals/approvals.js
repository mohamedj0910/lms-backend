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
exports.Approval = void 0;
const typeorm_1 = require("typeorm");
const leaveRequests_1 = require("../leaveRequests/leaveRequests");
let Approval = class Approval {
};
exports.Approval = Approval;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Approval.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => leaveRequests_1.LeaveRequest),
    (0, typeorm_1.JoinColumn)({ name: 'leaveRequestId' }),
    __metadata("design:type", leaveRequests_1.LeaveRequest)
], Approval.prototype, "leaveRequest", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'approved', 'rejected', 'not_required'],
        default: 'not_required',
    }),
    __metadata("design:type", String)
], Approval.prototype, "managerApproval", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'approved', 'rejected', 'not_required'],
        default: 'not_required',
        nullable: true,
    }),
    __metadata("design:type", String)
], Approval.prototype, "hrApproval", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'approved', 'rejected', 'not_required'],
        default: 'not_required',
        nullable: true,
    }),
    __metadata("design:type", String)
], Approval.prototype, "directorApproval", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], Approval.prototype, "overallStatus", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Approval.prototype, "createdAt", void 0);
exports.Approval = Approval = __decorate([
    (0, typeorm_1.Entity)()
], Approval);
