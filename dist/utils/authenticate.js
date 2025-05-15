"use strict";
// import { Request, ResponseToolkit } from '@hapi/hapi';
// import jwt =require('jsonwebtoken');
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
exports.authenticate = {
    assign: 'user',
    method: (request, h) => __awaiter(void 0, void 0, void 0, function* () {
        let token;
        // Get the auth token from cookie
        if (request.state.auth_token) {
            token = request.state.auth_token;
        }
        if (!token) {
            return h
                .response({ message: 'Auth token missing' })
                .code(401)
                .takeover();
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            request.plugins['user'] = decoded;
            return h.continue;
        }
        catch (err) {
            return h
                .response({ message: 'Invalid or expired token' })
                .code(401)
                .takeover();
        }
    })
};
