import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiConnector } from "../../Services/apiConnector";
import { notificationEndpoints } from "../../Services/apis";

const { GET_NOTIFICATIONS_API, MARK_READ_API } = notificationEndpoints;

export const fetchNotifications = createAsyncThunk(
  "notifications/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", GET_NOTIFICATIONS_API);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const markAsRead = createAsyncThunk(
  "notifications/markRead",
  async (id, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PUT", MARK_READ_API(id));
      return { id, data: res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const notificationSlice = createSlice({
  name: "notifications",
  initialState: {
    list: [],
    unreadCount: 0,
    loading: false,
    error: null,
  },
  reducers: {
    addNotification: (state, action) => {
      state.list.unshift(action.payload);
      state.unreadCount += 1;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        if (action.payload.id === 'all') {
            state.list.forEach(n => n.isRead = true);
            state.unreadCount = 0;
        } else {
            const n = state.list.find(notif => notif._id === action.payload.id);
            if (n && !n.isRead) {
                n.isRead = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        }
      });
  },
});

export const { addNotification, clearError } = notificationSlice.actions;
export default notificationSlice.reducer;
