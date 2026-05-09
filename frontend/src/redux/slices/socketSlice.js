import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isConnected: false,
  onlineUsers: [],
  error: null,
};

const socketSlice = createSlice({
  name: "socket",
  initialState,
  reducers: {
    setConnected: (state, action) => {
      state.isConnected = action.payload;
    },
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    setSocketError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { setConnected, setOnlineUsers, setSocketError } = socketSlice.actions;
export default socketSlice.reducer;
