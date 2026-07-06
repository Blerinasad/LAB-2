import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./auth.slice.js";
import notifReducer from "./notification.slice.js";
import toastReducer from "./toast.slice.js";
import themeReducer from "./theme.slice.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notif: notifReducer,
    toast: toastReducer,
    theme: themeReducer,
  },
});
