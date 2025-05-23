"use strict";
// import { Request, ResponseToolkit } from '@hapi/hapi';
// import jwt =require('jsonwebtoken');
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
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
const authenticate = (request, h) => {
    const cookie = request.state;
    // console.log(cookie)
    const token = cookie.auth_token;
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        request.plugins['user'] = decoded;
        // console.log(decoded)
        return h.continue;
    }
    catch (err) {
        return h.response({ message: 'Invalid or expired token' }).code(401).takeover();
    }
};
exports.authenticate = authenticate;
