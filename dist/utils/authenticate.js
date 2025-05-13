"use strict";
// import { Request, ResponseToolkit } from '@hapi/hapi';
// import jwt =require('jsonwebtoken');
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jwt = require("jsonwebtoken");
const authenticate = (request, h) => {
    let token;
    // // Check Authorization header first
    // const authHeader = request.headers.authorization;
    // if (authHeader && authHeader.startsWith('Bearer ')) {
    //   token = authHeader.split(' ')[1];
    // }
    // If no Bearer token, fallback to auth_token cookie
    if (request.state.auth_token) {
        token = request.state.auth_token;
    }
    if (!token) {
        return h.response({ message: 'Auth token missing' }).code(401).takeover();
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        request.plugins['user'] = decoded;
        return h.continue;
    }
    catch (err) {
        return h.response({ message: 'Invalid or expired token' }).code(401).takeover();
    }
};
exports.authenticate = authenticate;
