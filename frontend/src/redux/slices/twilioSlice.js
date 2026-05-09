import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiConnector } from '../../Services/apiConnector';
import { crmEndpoints } from '../../Services/apis';

export const getTwilioToken = createAsyncThunk(
    'twilio/getToken',
    async (_, { rejectWithValue }) => {
        try {
            const res = await apiConnector('GET', crmEndpoints.GET_TWILIO_TOKEN_API);
            if (!res.data.success) return rejectWithValue(res.data.message);
            return res.data.token;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || err.message);
        }
    }
);

const initialState = {
    token: null,
    status: 'idle', // idle, connecting, ringing, connected, ended
    error: null,
    currentCall: null, // call metadata
    showPostCallModal: false,
};

const twilioSlice = createSlice({
    name: 'twilio',
    initialState,
    reducers: {
        setCallStatus: (state, action) => {
            state.status = action.payload;
            if (action.payload === 'ended') {
                state.showPostCallModal = true;
            }
        },
        setCurrentCall: (state, action) => {
            state.currentCall = action.payload;
        },
        setShowPostCallModal: (state, action) => {
            state.showPostCallModal = action.payload;
        },
        resetCall: (state) => {
            state.status = 'idle';
            // We don't reset currentCall here because the PostCallModal needs it
        },
        finalizeCall: (state) => {
            state.status = 'idle';
            state.currentCall = null;
            state.showPostCallModal = false;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(getTwilioToken.fulfilled, (state, action) => {
                state.token = action.payload;
            })
            .addCase(getTwilioToken.rejected, (state, action) => {
                state.error = action.payload;
            });
    }
});

export const { setCallStatus, setCurrentCall, resetCall, setShowPostCallModal, finalizeCall } = twilioSlice.actions;
export default twilioSlice.reducer;
