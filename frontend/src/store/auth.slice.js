import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import api from "../services/api.js";

export const loginThunk = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      return data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || "Login dështoi");
    }
  },
);

export const meThunk = createAsyncThunk(
  "auth/me",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/auth/me");
      return data.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || "Failed");
    }
  },
);

export const refreshThunk = createAsyncThunk(
  "auth/refresh",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/refresh-token`,
        {},
        { withCredentials: true },
      );
      return data;
    } catch (e) {
      return rejectWithValue("Session expired");
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    token: null,
    loading: false,
    error: null,
    initialized: false,
  },
  reducers: {
    setToken: (state, { payload }) => {
      state.token = payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.initialized = true;
    },
  },
  extraReducers: (b) => {
    b.addCase(loginThunk.pending, (s) => {
      s.loading = true;
      s.error = null;
    })
      .addCase(loginThunk.fulfilled, (s, { payload }) => {
        s.loading = false;
        s.token = payload.data?.accessToken;
        s.user = payload.data?.user;
        s.initialized = true;
      })
      .addCase(loginThunk.rejected, (s, { payload }) => {
        s.loading = false;
        s.error = payload;
      })

      .addCase(meThunk.fulfilled, (s, { payload }) => {
        s.user = payload;
      })

      .addCase(refreshThunk.fulfilled, (s, { payload }) => {
        s.token = payload.data?.accessToken;
        s.user = payload.data?.user || s.user;
        s.initialized = true;
      })
      .addCase(refreshThunk.rejected, (s) => {
        s.initialized = true;
      });
  },
});

export const { setToken, logout } = authSlice.actions;
export default authSlice.reducer;
