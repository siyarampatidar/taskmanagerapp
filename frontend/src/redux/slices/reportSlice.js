import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { reportEndpoints } from "../../Services/apis";
import { apiConnector } from "../../Services/apiConnector";

const initialState = {
  stats: null,
  dailyReports: [],
  loading: false,
  error: null,
};

export const fetchDashboardStats = createAsyncThunk(
  "reports/fetchStats",
  async (period, { rejectWithValue }) => {
    try {
      const url = period 
        ? `${reportEndpoints.GET_DASHBOARD_STATS_API}?period=${period}` 
        : reportEndpoints.GET_DASHBOARD_STATS_API;
      const res = await apiConnector("GET", url);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.stats || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const submitDailyReport = createAsyncThunk(
  "reports/submitDaily",
  async (formData, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", reportEndpoints.SUBMIT_DAILY_REPORT_API, formData);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.report;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchDailyReports = createAsyncThunk(
  "reports/fetchDaily",
  async (params = {}, { rejectWithValue }) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString 
        ? `${reportEndpoints.GET_DAILY_REPORTS_API}?${queryString}`
        : reportEndpoints.GET_DAILY_REPORTS_API;
      
      const res = await apiConnector("GET", url);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.reports;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateDailyReport = createAsyncThunk(
  "reports/updateDaily",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PUT", reportEndpoints.UPDATE_DAILY_REPORT_API(id), data);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.report;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteDailyReport = createAsyncThunk(
  "reports/deleteDaily",
  async (id, { rejectWithValue }) => {
    try {
      const res = await apiConnector("DELETE", reportEndpoints.DELETE_DAILY_REPORT_API(id));
      if (!res.data.success) return rejectWithValue(res.data.message);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const addReaction = createAsyncThunk(
  "reports/addReaction",
  async ({ id, reactionType }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", reportEndpoints.REACT_DAILY_REPORT_API(id), { reactionType });
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.report;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const exportDailyReports = createAsyncThunk(
  "reports/export",
  async (params = {}, { rejectWithValue }) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString 
        ? `${reportEndpoints.EXPORT_DAILY_REPORTS_API}?${queryString}`
        : reportEndpoints.EXPORT_DAILY_REPORTS_API;
      
      const res = await apiConnector("GET", url, null, null, null, { responseType: 'blob' });
      
      // Create download link
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `Daily_Reports_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const reportSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(submitDailyReport.pending, (state) => {
        state.loading = true;
      })
      .addCase(submitDailyReport.fulfilled, (state, action) => {
        state.loading = false;
        // Optional: Update local list if needed
      })
      .addCase(submitDailyReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchDailyReports.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDailyReports.fulfilled, (state, action) => {
        state.loading = false;
        state.dailyReports = action.payload;
      })
      .addCase(fetchDailyReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateDailyReport.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateDailyReport.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.dailyReports.findIndex(r => r._id === action.payload._id);
        if (index !== -1) {
          state.dailyReports[index] = { ...state.dailyReports[index], ...action.payload };
        }
      })
      .addCase(updateDailyReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteDailyReport.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteDailyReport.fulfilled, (state, action) => {
        state.loading = false;
        state.dailyReports = state.dailyReports.filter(r => r._id !== action.payload);
      })
      .addCase(deleteDailyReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addReaction.fulfilled, (state, action) => {
        const index = state.dailyReports.findIndex(r => r._id === action.payload._id);
        if (index !== -1) {
          state.dailyReports[index] = { ...state.dailyReports[index], ...action.payload };
        }
      });
  },
});

export default reportSlice.reducer;
