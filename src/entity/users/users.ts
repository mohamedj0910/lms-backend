import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn
} from 'typeorm';
import { LeaveRequest } from '../leaveRequests/leaveRequests';
import { LeaveDetail } from '../leaveDetails/leaveDetail';

@Entity()
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  fullName: string;

  @Column({
    type: 'enum',
    enum: ['employee', 'hr', 'director', 'IT Administrator'],
    default: 'employee',
  })
  role: 'employee' | 'hr' | 'director' | 'IT Administrator';

  @Column({ default: false })
  isManager: boolean;

  @Column({default:false})
  isDeleted : boolean


  @ManyToOne(() => Employee, (employee) => employee.subordinates, { nullable: true })
  @JoinColumn({ name: 'managerId' })
  manager: Employee;

  @OneToMany(() => Employee, (employee) => employee.manager)
  subordinates: Employee[];

  @OneToMany(() => LeaveRequest, (leave) => leave.employee)
  leaveRequests: LeaveRequest[];

  @OneToMany(() => LeaveDetail, (detail) => detail.employee)
  leaveDetails: LeaveDetail[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}