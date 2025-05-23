// import { Request, ResponseToolkit } from '@hapi/hapi';
// import jwt =require('jsonwebtoken');

// export const authenticate = (request: Request, h: ResponseToolkit) => {

//     console.log(request.headers)
//   const authHeader = request.headers.authorization;

//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     return h.response({ message: 'Authorization token is missing or malformed' }).code(401).takeover();
//   }

//   const token = authHeader.split(' ')[1];

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET!);
//     request.plugins['user'] = decoded;
//     console.log(decoded)
//     return h.continue;
//   } catch (err) {
//     return h.response({ message: 'Invalid or expired token' }).code(401).takeover();
//   }
// };


import { Request, ResponseToolkit } from '@hapi/hapi';
import jwt from 'jsonwebtoken';

// export const authenticate = {
//   assign: 'user',
//   method: async (request: Request, h: ResponseToolkit) => {
//     let token: string | undefined;

//     // Get the auth token from cookie
//     if (request.state.auth_token) {
//       token = request.state.auth_token;
//     }

//     if (!token) {
//       return h
//         .response({ message: 'Auth token missing' })
//         .code(401)
//         .takeover();
//     }

//     try {
//       const decoded = jwt.verify(token, process.env.JWT_SECRET!);
//       request.plugins['user'] = decoded;
//       return h.continue;
//     } catch (err) {
//       return h
//         .response({ message: 'Invalid or expired token' })
//         .code(401)
//         .takeover();
//     }
//   }
// };

export const authenticate = (request: Request, h: ResponseToolkit) => {
  const cookie = request.state;
  // console.log(cookie)

  const token = cookie.auth_token

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    request.plugins['user'] = decoded;
    // console.log(decoded)
    return h.continue;
  } catch (err) {
    return h.response({ message: 'Invalid or expired token' }).code(401).takeover();
  }
};
