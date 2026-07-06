import { createSlice } from "@reduxjs/toolkit";

let _id = 0;

const toastSlice = createSlice({
  name: "toast",
  initialState: { items: [] },
  reducers: {
    addToast: (s, { payload }) => {
      s.items.push({ id: ++_id, ...payload });
    },
    removeToast: (s, { payload }) => {
      s.items = s.items.filter((t) => t.id !== payload);
    },
  },
});

export const { addToast, removeToast } = toastSlice.actions;
export default toastSlice.reducer;

// Thunk helper
export const toast = (type, title, msg) => (dispatch) => {
  const id = ++_id;
  dispatch(addToast({ id, type, title, msg }));
  setTimeout(() => dispatch(removeToast(id)), 4000);
};
