import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const fetchPlans = createAsyncThunk('subscription/fetchPlans', async (_, { rejectWithValue }) => {
    try {
        const response = await axios.get(`${API_URL}/superadmin/plans`);
        return response.data.plans;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchSubscriptionStatus = createAsyncThunk('subscription/fetchStatus', async (companyId, { rejectWithValue }) => {
    try {
        const token = localStorage.getItem('teamflow_token');
        const response = await axios.get(`${API_URL}/subscriptions/status/${companyId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data.subscription;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const activateFreePlan = createAsyncThunk('subscription/activateFree', async ({ planId, companyId }, { rejectWithValue }) => {
    try {
        const token = localStorage.getItem('teamflow_token');
        const response = await axios.post(`${API_URL}/subscriptions/activate-free`, { planId, companyId }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

const subscriptionSlice = createSlice({
    name: 'subscription',
    initialState: {
        plans: [],
        currentSubscription: null,
        loading: false,
        error: null
    },
    reducers: {
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPlans.pending, (state) => { state.loading = true; })
            .addCase(fetchPlans.fulfilled, (state, action) => {
                state.loading = false;
                state.plans = action.payload;
            })
            .addCase(fetchPlans.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchSubscriptionStatus.fulfilled, (state, action) => {
                state.currentSubscription = action.payload;
            })
            .addCase(activateFreePlan.fulfilled, (state, action) => {
                state.loading = false;
            });
    }
});

export const { clearError } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;
