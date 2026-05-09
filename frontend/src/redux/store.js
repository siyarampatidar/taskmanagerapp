import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import crmReducer from "./slices/crmSlice";
import taskReducer from "./slices/taskSlice";
import hrReducer from "./slices/hrSlice";
import chatReducer from "./slices/chatSlice";
import reportReducer from "./slices/reportSlice";
import superAdminReducer from "./slices/superAdminSlice";
import attendanceReducer from "./slices/attendanceSlice";
import notificationReducer from "./slices/notificationSlice";
import socketReducer from "./slices/socketSlice";
import callReducer from "./slices/callSlice";
import twilioReducer from "./slices/twilioSlice";
import projectReducer from "./slices/projectSlice";
import billingReducer from "./slices/billingSlice";
import subscriptionReducer from "./slices/subscriptionSlice";
import socketMiddleware from "./middleware/socketMiddleware";

const store = configureStore({
  reducer: {
    auth: authReducer,
    crm: crmReducer,
    tasks: taskReducer,
    hr: hrReducer,
    chat: chatReducer,
    reports: reportReducer,
    superAdmin: superAdminReducer,
    attendance: attendanceReducer,
    notifications: notificationReducer,
    socket: socketReducer,
    call: callReducer,
    twilio: twilioReducer,
    projects: projectReducer,
    billing: billingReducer,
    subscription: subscriptionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['socket/emit', 'call/iceCandidate', 'call/callAccepted', 'twilio/getToken/fulfilled'],
      },
    }).concat(socketMiddleware),
});

export default store;
