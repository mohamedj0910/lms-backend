import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { LeaveRequest } from '../leaveRequests/leaveRequests';

@Entity()
export class Approval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => LeaveRequest)
  @JoinColumn({ name: 'leaveRequestId' })
  leaveRequest: LeaveRequest;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'not_required'],
    default: 'not_required',
  })
  managerApproval: 'pending' | 'approved' | 'rejected' | 'not_required';

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'not_required'],
    default: 'not_required',
    nullable: true,
  })
  hrApproval: 'pending' | 'approved' | 'rejected' | 'not_required';

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'not_required'],
    default: 'not_required',
    nullable: true,
  })
  directorApproval: 'pending' | 'approved' | 'rejected' | 'not_required';

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  overallStatus: 'pending' | 'approved' | 'rejected';

  @CreateDateColumn()
  createdAt: Date;

}