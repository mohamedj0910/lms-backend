import * as Hapi from '@hapi/hapi';
import { Server } from '@hapi/hapi';
import { dataSource } from './db/database';
import { userController } from './entity/users/usersController';
import { leaveReqController } from './entity/leaveRequests/leaveReqConroller';
import { leaveDetailsController } from './entity/leaveDetails/leaveDetailsController';
import { leaveTypeController } from './entity/leaveTypes/leaveTypeController';
import { approvalController } from './entity/approvals/approvalController';
import dotenv from 'dotenv';


dotenv.config();

const init = async () => {
  const server: Server = Hapi.server({
    port: parseInt(process.env.PORT || '3000'), // Use dynamic port for Render
    host: '0.0.0.0',
    routes: {
      cors: {
        origin: ['*'],
        credentials: true
      }
    }
  });


  try {
    await dataSource.initialize();
    console.log('📦 Database connected');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }


  server.route([
    ...userController,
    ...leaveReqController,
    ...leaveDetailsController,
    ...leaveTypeController,
    ...approvalController
  ]);


  await server.start();
  console.log('🚀 Server running on %s', server.info.uri);
};


process.on('unhandledRejection', (err) => {
  console.error('❗ Unhandled Rejection:', err);
  process.exit(1);
});

init();
