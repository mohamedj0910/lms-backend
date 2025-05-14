import * as Hapi from '@hapi/hapi';
import { Server } from '@hapi/hapi';
import { dataSource } from './db/database';
import { userController } from './entity/users/usersController';
import dotenv = require('dotenv');
import { leaveReqController } from './entity/leaveRequests/leaveReqConroller';
import { leaveDetailsController } from './entity/leaveDetails/leaveDetailsController';
import { leaveTypeController } from './entity/leaveTypes/leaveTypeController';
import { approvalController } from './entity/approvals/approvalController';

dotenv.config();

const init = async () => {
  const server: Server = Hapi.server({
    port: 3000,
    host: 'localhost',
    routes: {
      cors: {
        origin: ['http://localhost:3001', 'lms--frontend.vercel.app'],
        credentials: true
      }
    }
  });


  server.route([...userController, ...leaveReqController, ...leaveDetailsController, ...leaveTypeController, ...approvalController]);
  await server.start();
  console.log('Server running on %s', server.info.uri);
  console.log(dataSource)
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();
