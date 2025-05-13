import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Employee } from '../users/users';
import { LeaveType } from '../leaveTypes/leaveType';

@Entity()
export class LeaveDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, (employee) => employee.leaveDetails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @ManyToOne(() => LeaveType, (type) => type.leaveDetails, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leaveTypeId' })
  leaveType: LeaveType;

  @Column({ type: 'int', default: 0 })
  allocated: number;

  @Column({ type: 'int', default: 0 })
  used: number;

  @Column({ type: 'int', default: 0 })
  remaining: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
