import * as Hapi from '@hapi/hapi';
import { Server } from '@hapi/hapi';
import * as Inert from '@hapi/inert';
import * as Vision from '@hapi/vision';
import * as HapiSwagger from 'hapi-swagger';
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
    port: parseInt(process.env.PORT || '3000'),
    host: '0.0.0.0',
    routes: {
      cors: {
        origin: ['http://localhost:3001', 'https://lms--frontend.vercel.app'],
        credentials: true
      }
    }
  });

  // Register plugins for Swagger
  await server.register([
    Inert,
    Vision,
    {
      plugin: HapiSwagger,
      options: {
        info: {
          title: 'Leave Management System API',
          version: '1.0.0',
          description: 'API documentation for the Leave Management System'
        },
        documentationPath: '/docs',
        swaggerUI: true,
        schemes: ['http', 'https'],
        grouping: 'tags'
      }
    }
  ]);

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
  console.log('📖 Swagger UI available at %s/documentation', server.info.uri);
};

process.on('unhandledRejection', (err) => {
  console.error('❗ Unhandled Rejection:', err);
  process.exit(1);
});

init();