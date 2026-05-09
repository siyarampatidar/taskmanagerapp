import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  receivingCall: false,
  callerId: '',
  callerName: '',
  roomName: '',
  type: 'video', // 'video' or 'voice'
  isCalling: false,
  activeCall: false,
  isChannelCall: false,
  channelId: null,
  isScreenSharing: false,
};

const callSlice = createSlice({
  name: "call",
  initialState,
  reducers: {
    incomingCall: (state, action) => {
      const { from, name, roomName, type, isChannel, channelId } = action.payload;
      
      if (state.activeCall || state.isCalling) return;

      state.receivingCall = true;
      state.callerId = from;
      state.callerName = name;
      state.roomName = roomName;
      state.type = type;
      state.isChannelCall = !!isChannel;
      state.channelId = channelId;
      state.activeCall = false;
      state.isCalling = false;
    },
    callAccepted: (state, action) => {
      state.activeCall = true;
      state.isCalling = false;
      state.receivingCall = false;
      if (action.payload) {
        state.roomName = action.payload.roomName || state.roomName;
        state.type = action.payload.type || state.type;
        state.callerId = action.payload.callerId || state.callerId;
        state.callerName = action.payload.callerName || state.callerName;
        state.isChannelCall = action.payload.isChannelCall !== undefined ? action.payload.isChannelCall : state.isChannelCall;
        state.channelId = action.payload.channelId || state.channelId;
      }
    },

    callRejected: (state) => {
      return initialState;
    },
    callEnded: (state) => {
      return initialState;
    },
    initiateCall: (state, action) => {
      const { userId, userName, type, roomName, isChannel, channelId } = action.payload;
      state.isCalling = true;
      state.callerId = userId;
      state.callerName = userName;
      state.roomName = roomName;
      state.type = type;
      state.isChannelCall = !!isChannel;
      state.channelId = channelId;
      state.activeCall = false;
      state.receivingCall = false;
    },
    resetCall: (state) => {
      return initialState;
    },
    setScreenSharing: (state, action) => {
      state.isScreenSharing = action.payload;
    }
  },
});

export const { 
    incomingCall, 
    callAccepted, 
    callRejected, 
    callEnded, 
    initiateCall, 
    resetCall,
    setScreenSharing
} = callSlice.actions;

export default callSlice.reducer;
