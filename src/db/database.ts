import dotenv from 'dotenv';
dotenv.config();
import { DataSource } from "typeorm";
import { Employee } from "../entity/users/users";
import { LeaveRequest } from "../entity/leaveRequests/leaveRequests";
import { LeaveDetail } from "../entity/leaveDetails/leaveDetail";
import { Approval } from "../entity/approvals/approvals";
import { LeaveType } from "../entity/leaveTypes/leaveType";

const isSSL = process.env.SSL_MODE === 'REQUIRED';

const dataSource = new DataSource({
  type: "mysql",
  host: process.env.HOST,
  username: process.env.USER_NAME,
  password: process.env.PASSWORD,
  port:parseInt(process.env.PORT1),
  database: process.env.DATABASE,
  ssl: isSSL ? { rejectUnauthorized: false } : undefined,
  entities: [Employee, LeaveRequest, LeaveDetail, Approval, LeaveType],
  synchronize: true,
});

dataSource.initialize()
  .then(() => {
    console.log("✅ Database connection established");
  })
  .catch((err: Error) => {
    console.error("❌ Database connection error:", err);
  });

export { dataSource };
