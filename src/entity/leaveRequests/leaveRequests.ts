import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToOne
} from 'typeorm';
import { Employee } from '../users/users';
import { LeaveType } from '../leaveTypes/leaveType';
import {Approval} from '../approvals/approvals'

@Entity()
export class LeaveRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, (employee) => employee.leaveRequests)
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @ManyToOne(() => LeaveType)
  @JoinColumn({ name: 'leaveTypeId' })
  leaveType: LeaveType;

  @Column('date')
  startDate: string;

  @Column('date')
  endDate: string;

  @Column('text')
  reason: string;

  @Column('int')
  duration:number;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
  })
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';

  @CreateDateColumn()
  createdAt: Date;

  @OneToOne(() => Approval, approval => approval.leaveRequest, { cascade: true })
  approval: Approval;

}
