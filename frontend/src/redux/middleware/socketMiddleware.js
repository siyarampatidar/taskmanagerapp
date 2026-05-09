import { io } from "socket.io-client";
import { setConnected, setOnlineUsers } from "../slices/socketSlice";
import { addNotification } from "../slices/notificationSlice";
import { BACKEND_URL } from "../../Services/apis";
import { addMessage, removeMessage, markMessagesRead, incrementUnread, updateMessageReaction } from "../slices/chatSlice";

const NOTIFICATION_SOUND_URL = 'https://www.soundjay.com/buttons/beep-07a.mp3';
let socket = null;
let audio = null;

// Initialize audio only on client side
if (typeof window !== 'undefined') {
  audio = new Audio(NOTIFICATION_SOUND_URL);
}

const playNotificationSound = () => {
  if (audio) {
    try {
      audio.currentTime = 0;
      audio.play().catch(e => console.log('Sound play blocked:', e));
    } catch (err) {}
  }
};

const showBrowserNotification = (notif) => {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(notif.title || 'New Alert', {
      body: notif.message || 'You have a new update in your dashboard.',
      icon: '/favicon.ico',
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};

const socketMiddleware = (store) => (next) => (action) => {
  const { dispatch, getState } = store;

  // Handle Socket Initialization
  if (action.type === 'socket/initiate') {
    const state = getState();
    const token = state.auth.token;

    if (token && !socket) {
      socket = io(BACKEND_URL, {
        auth: { token },
        transports: ['polling', 'websocket'],
        withCredentials: true
      });

      socket.on('connect', () => {
        dispatch(setConnected(true));
        console.log('Socket connected middleware:', socket.id);
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      });

      socket.on('disconnect', () => {
        dispatch(setConnected(false));
      });

      socket.on('onlineUsers', (users) => {
        dispatch(setOnlineUsers(users));
      });

      // Global Notifications
      socket.on('newNotification', (notif) => {
        dispatch(addNotification(notif));
        playNotificationSound();
        showBrowserNotification(notif);
      });

      socket.on('taskCreated', (task) => {
        const currentUser = getState().auth.user;
        const currentUserId = currentUser?.id || currentUser?._id;
        if (task.assignedTo === currentUserId || task.assignedTo?._id === currentUserId) {
          playNotificationSound();
          showBrowserNotification({ title: 'New Task Assigned', message: task.title });
        }
      });

      socket.on('leadCreated', (newLead) => {
        dispatch({ type: 'crm/createLead/fulfilled', payload: newLead });
      });

      socket.on('taskUpdated', (updatedTask) => {
        dispatch({ type: 'tasks/updateStatus/fulfilled', payload: updatedTask });
      });

      // Chat Events
      socket.on('newMessage', (msg) => {
        const state = getState();
        const activeChannelId = state.chat.activeChannelId;
        const msgChannelId = (msg.channelId?._id || msg.channelId)?.toString();
        const currentUser = state.auth.user;
        const currentUserId = (currentUser?.id || currentUser?._id)?.toString();
        const isMe = (msg.senderId?._id || msg.senderId)?.toString() === currentUserId;

        if (msgChannelId === activeChannelId?.toString()) {
          dispatch(addMessage(msg));
          if (!isMe) {
            // Logic moved from component: if active, mark as read
            socket.emit('markAsRead', { channelId: msgChannelId });
          }
        } else {
          if (!isMe) {
            dispatch(incrementUnread(msgChannelId));
          }
        }
      });

      socket.on('messageDeleted', (msgId) => {
        dispatch(removeMessage(msgId));
      });

      socket.on('messageReacted', ({ messageId, reactions }) => {
        dispatch(updateMessageReaction({ messageId, reactions }));
      });

      socket.on('messagesRead', ({ channelId, userId }) => {
        dispatch(markMessagesRead({ channelId, userId }));
      });

      socket.on('typing', ({ channelId, userId, userName }) => {
        dispatch({ type: 'chat/setTyping', payload: { channelId, userId, userName } });
      });

      socket.on('stopTyping', ({ channelId, userId }) => {
        dispatch({ type: 'chat/removeTyping', payload: { channelId, userId } });
      });

      // LiveKit Call Invitation Events
      socket.on('incomingCall', (data) => {
        dispatch({ type: 'call/incomingCall', payload: data });
      });
      socket.on('callAccepted', (data) => {
        dispatch({ type: 'call/callAccepted', payload: data });
      });
      socket.on('callRejected', (data) => {
        dispatch({ type: 'call/callRejected', payload: data });
      });
      socket.on('callEnded', (data) => {
        dispatch({ type: 'call/callEnded', payload: data });
      });

    }
  }

  // Handle Socket Disconnection
  if (action.type === 'auth/logout' || action.type === 'socket/disconnect') {
    if (socket) {
      socket.disconnect();
      socket = null;
      dispatch(setConnected(false));
    }
  }

  // Generic Emit Action
  if (action.type === 'socket/emit') {
    const { event, data } = action.payload;
    if (socket) {
      socket.emit(event, data);
    } else {
      console.warn(`Attempted to emit event "${event}" but socket is not connected.`);
    }
  }

  return next(action);
};

export default socketMiddleware;
