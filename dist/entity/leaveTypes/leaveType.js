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
exports.LeaveType = void 0;
const typeorm_1 = require("typeorm");
const leaveRequests_1 = require("../leaveRequests/leaveRequests");
const leaveDetail_1 = require("../leaveDetails/leaveDetail");
let LeaveType = class LeaveType {
};
exports.LeaveType = LeaveType;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], LeaveType.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], LeaveType.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], LeaveType.prototype, "maxLeave", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => leaveRequests_1.LeaveRequest, (request) => request.leaveType),
    __metadata("design:type", Array)
], LeaveType.prototype, "leaveRequests", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => leaveDetail_1.LeaveDetail, (detail) => detail.leaveType),
    __metadata("design:type", Array)
], LeaveType.prototype, "leaveDetails", void 0);
exports.LeaveType = LeaveType = __decorate([
    (0, typeorm_1.Entity)()
], LeaveType);
