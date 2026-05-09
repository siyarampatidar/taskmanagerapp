import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { chatEndpoints } from "../../Services/apis";
import { apiConnector } from "../../Services/apiConnector";

const initialState = {
  channels: [],
  messages: [],
  unreadCounts: {},
  activeChannelId: null,
  typingUsers: {}, // { channelId: [ { userId, userName } ] }
  pinnedChannelIds: [],  // for pin chat feature
  replyingTo: null,     // { _id, text, senderName }
  pagination: {
    page: 1,
    hasMore: true,
  },
  loading: false,
  error: null,
};

export const fetchChannels = createAsyncThunk(
  "chat/fetchChannels",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", chatEndpoints.GET_CHANNELS_API);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async ({ channelId, page = 1 }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", `${chatEndpoints.GET_MESSAGES_API(channelId)}?page=${page}`);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return { 
        messages: res.data.messages, 
        hasMore: res.data.hasMore, 
        page, 
        isNewLoad: page === 1 
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createDirectChannel = createAsyncThunk(
  "chat/createDirect",
  async (targetUserId, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", chatEndpoints.CREATE_DM_API, { targetUserId });
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const markAsRead = createAsyncThunk(
  "chat/markAsRead",
  async (channelId, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PUT", chatEndpoints.MARK_AS_READ_API(channelId));
      return { channelId, success: res.data.success };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createChannel = createAsyncThunk(
  "chat/createChannel",
  async (channelData, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", chatEndpoints.GET_CHANNELS_API, channelData);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.channel;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const inviteToChannel = createAsyncThunk(
  "chat/inviteToChannel",
  async ({ channelId, userIds }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", chatEndpoints.INVITE_MEMBER_API(channelId), { userIds });
      if (!res.data.success) return rejectWithValue(res.data.message);
      return { channelId, members: res.data.members };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addMessage: (state, action) => {
      const msg = action.payload;
      // Ensure readBy is an array and includes sender
      const senderId = (msg.senderId?._id || msg.senderId)?.toString();
      const readBy = msg.readBy || [];
      if (senderId && !readBy.includes(senderId)) {
        readBy.push(senderId);
      }
      
      state.messages.push({ ...msg, readBy });
      
      const cid = (msg.channelId?._id || msg.channelId)?.toString();
      const index = state.channels.findIndex(c => c._id === cid);
      if (index !== -1) {
        state.channels[index].lastMessageAt = msg.createdAt;
        state.channels[index].lastMessage = msg.text;
      }
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    removeMessage: (state, action) => {
      state.messages = state.messages.filter(m => m._id !== action.payload);
    },
    incrementUnread: (state, action) => {
      const channelId = action.payload;
      state.unreadCounts[channelId] = (state.unreadCounts[channelId] || 0) + 1;
    },
    setUnreadCounts: (state, action) => {
      state.unreadCounts = action.payload;
    },
    clearUnread: (state, action) => {
      state.unreadCounts[action.payload] = 0;
    },
    markMessagesRead: (state, action) => {
      const { channelId, userId } = action.payload;
      const targetCid = channelId?.toString();
      const targetUid = userId?.toString();

      if (state.activeChannelId?.toString() === targetCid) {
          state.messages.forEach(m => {
            if (!m.readBy) m.readBy = [];
            if (!m.readBy.map(id => id.toString()).includes(targetUid)) {
              m.readBy.push(targetUid);
            }
          });
      }
    },
    setActiveChannelId: (state, action) => {
      state.activeChannelId = action.payload;
    },
    setTyping: (state, action) => {
      const { channelId, userId, userName } = action.payload;
      if (!state.typingUsers[channelId]) state.typingUsers[channelId] = [];
      const exists = state.typingUsers[channelId].find(u => u.userId === userId);
      if (!exists) {
        state.typingUsers[channelId].push({ userId, userName });
      }
    },
    removeTyping: (state, action) => {
      const { channelId, userId } = action.payload;
      if (state.typingUsers[channelId]) {
        state.typingUsers[channelId] = state.typingUsers[channelId].filter(u => u.userId !== userId);
      }
    },
    updateMessageReaction: (state, action) => {
      const { messageId, reactions } = action.payload;
      const msg = state.messages.find(m => m._id?.toString() === messageId?.toString());
      if (msg) {
        msg.reactions = reactions;
      }
    },
    togglePinChannel: (state, action) => {
      const channelId = action.payload;
      if (state.pinnedChannelIds.includes(channelId)) {
        state.pinnedChannelIds = state.pinnedChannelIds.filter(id => id !== channelId);
      } else {
        state.pinnedChannelIds.push(channelId);
      }
    },
    setReplyingTo: (state, action) => {
      state.replyingTo = action.payload; // null to clear
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChannels.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchChannels.fulfilled, (state, action) => {
        state.loading = false;
        state.channels = action.payload.channels || action.payload;
        const counts = {};
        (action.payload.channels || action.payload).forEach(c => {
          counts[c._id] = c.unreadCount || 0;
        });
        state.unreadCounts = counts;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { messages, hasMore, page, isNewLoad } = action.payload;
        if (isNewLoad) {
          state.messages = messages;
        } else {
          // Prepend old messages
          state.messages = [...messages, ...state.messages];
        }
        state.pagination = { page, hasMore };
      })
      .addCase(createDirectChannel.fulfilled, (state, action) => {
        const index = state.channels.findIndex(c => c._id === action.payload.channel._id);
        if (index === -1) {
          state.channels.unshift(action.payload.channel);
        }
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        state.unreadCounts[action.payload.channelId] = 0;
      })
      .addCase(createChannel.fulfilled, (state, action) => {
        // Newly created channel add karo list mein
        if (action.payload) {
          state.channels.unshift(action.payload);
        }
      })
      .addCase(inviteToChannel.fulfilled, (state, action) => {
        // Channel ke members update karo
        const idx = state.channels.findIndex(c => c._id === action.payload.channelId);
        if (idx !== -1) {
          state.channels[idx].members = action.payload.members;
        }
      });
  },
});

export const { 
    addMessage, 
    clearMessages, 
    removeMessage, 
    incrementUnread, 
    setUnreadCounts, 
    markMessagesRead,
    setActiveChannelId,
    setTyping,
    removeTyping,
    updateMessageReaction,
    togglePinChannel,
    setReplyingTo
} = chatSlice.actions;
export default chatSlice.reducer;
