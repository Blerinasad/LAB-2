import { createSlice } from "@reduxjs/toolkit";

// ─── Notifications ─────────────────────────────────────────
const notifSlice = createSlice({
  name: "notif",
  initialState: { unread: 0, items: [] },
  reducers: {
    setUnread: (s, { payload }) => { s.unread = payload; },
    addNotif: (s, { payload }) => { s.items.unshift(payload); s.unread += 1; },
    markRead: (s, { payload }) => {
      const n = s.items.find((x) => x.id === payload);
      if (n && !n.is_read) { n.is_read = 1; s.unread = Math.max(0, s.unread - 1); }
    },
    setItems: (s, { payload }) => { s.items = payload; },
  },
});
export const { setUnread, addNotif, markRead, setItems } = notifSlice.actions;
export const notifReducer = notifSlice.reducer;
export default notifReducer;
