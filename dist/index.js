"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const Hapi = __importStar(require("@hapi/hapi"));
const database_1 = require("./db/database");
const usersController_1 = require("./entity/users/usersController");
const leaveReqConroller_1 = require("./entity/leaveRequests/leaveReqConroller");
const leaveDetailsController_1 = require("./entity/leaveDetails/leaveDetailsController");
const leaveTypeController_1 = require("./entity/leaveTypes/leaveTypeController");
const approvalController_1 = require("./entity/approvals/approvalController");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const init = () => __awaiter(void 0, void 0, void 0, function* () {
    const server = Hapi.server({
        port: parseInt(process.env.PORT || '3000'),
        host: '0.0.0.0',
        routes: {
            cors: {
                origin: ['http://localhost:3001', 'https://lms--frontend.vercel.app/'],
                credentials: true
            }
        }
    });
    try {
        yield database_1.dataSource.initialize();
        console.log('📦 Database connected');
    }
    catch (error) {
        console.error('❌ Database connection error:', error);
        process.exit(1);
    }
    server.route([
        ...usersController_1.userController,
        ...leaveReqConroller_1.leaveReqController,
        ...leaveDetailsController_1.leaveDetailsController,
        ...leaveTypeController_1.leaveTypeController,
        ...approvalController_1.approvalController
    ]);
    yield server.start();
    console.log('🚀 Server running on %s', server.info.uri);
});
process.on('unhandledRejection', (err) => {
    console.error('❗ Unhandled Rejection:', err);
    process.exit(1);
});
init();
