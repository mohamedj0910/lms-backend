


import { Request, ResponseToolkit } from '@hapi/hapi';
import jwt from 'jsonwebtoken';


export const authenticate = (request: Request, h: ResponseToolkit) => {
  const cookie = request.state;

  const token = cookie.auth_token

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    request.plugins['user'] = decoded;
    return h.continue;
  } catch (err) {
    return h.response({ message: 'Invalid or expired token' }).code(401).takeover();
  }
};
