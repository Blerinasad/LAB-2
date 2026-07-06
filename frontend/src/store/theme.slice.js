import { createSlice } from "@reduxjs/toolkit";

// Lexo preferencën e ruajtur (localStorage → OS preference)
const getSavedTheme = () => {
  const saved = localStorage.getItem("sk_theme");
  if (saved) return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyTheme = (theme) => {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  localStorage.setItem("sk_theme", theme);
};

const themeSlice = createSlice({
  name: "theme",
  initialState: {
    mode: getSavedTheme(),
  },
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === "dark" ? "light" : "dark";
      applyTheme(state.mode);
    },
    setTheme: (state, { payload }) => {
      state.mode = payload;
      applyTheme(payload);
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
