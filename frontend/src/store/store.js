import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice.js";
import notifReducer from "./notifSlice.js";
import toastReducer from "./toastSlice.js";
import themeReducer from "./themeSlice.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notif: notifReducer,
    toast: toastReducer,
    theme: themeReducer,
  },
});
