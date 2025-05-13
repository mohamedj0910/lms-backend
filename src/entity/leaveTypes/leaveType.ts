import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { LeaveRequest } from '../leaveRequests/leaveRequests';
import { LeaveDetail } from '../leaveDetails/leaveDetail';

@Entity()
export class LeaveType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string;

  @Column()
  maxLeave: number;

  @OneToMany(() => LeaveRequest, (request) => request.leaveType)
  leaveRequests: LeaveRequest[];

  @OneToMany(() => LeaveDetail, (detail) => detail.leaveType)
  leaveDetails: LeaveDetail[];
}