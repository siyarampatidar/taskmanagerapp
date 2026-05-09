import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiConnector } from "../../Services/apiConnector";
import { attendanceEndpoints, companyEndpoints } from "../../Services/apis";

const initialState = {
  attendance: [],
  salaryReport: [],
  companyDetails: null,
  leaves: [],
  loading: false,
  error: null,
};

export const fetchMyAttendance = createAsyncThunk(
  "attendance/fetchMy",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", attendanceEndpoints.GET_ATTENDANCE_API);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.attendance;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const checkInAction = createAsyncThunk(
  "attendance/checkIn",
  async (location, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", attendanceEndpoints.CHECK_IN_API, location);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.attendance;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const checkOutAction = createAsyncThunk(
  "attendance/checkOut",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", attendanceEndpoints.CHECK_OUT_API);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.attendance;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchSalaryReport = createAsyncThunk(
  "attendance/fetchSalary",
  async ({ month, year }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", `${attendanceEndpoints.GET_SALARY_REPORT_API}?month=${month}&year=${year}`);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.report;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchCompanyDetails = createAsyncThunk(
  "attendance/fetchCompany",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", companyEndpoints.GET_COMPANY_API);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.company;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateOfficeLocation = createAsyncThunk(
  "attendance/updateLocation",
  async (data, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PATCH", companyEndpoints.UPDATE_LOCATION_API, data);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.company;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const manualUpdateAttendance = createAsyncThunk(
  "attendance/manualUpdate",
  async (data, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", attendanceEndpoints.MANUAL_UPDATE_API, data);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.attendance;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchLeaves = createAsyncThunk(
  "attendance/fetchLeaves",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", "/leaves");
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.leaves;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const applyLeave = createAsyncThunk(
  "attendance/applyLeave",
  async (data, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", "/leaves/apply", data);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.leave;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const processLeave = createAsyncThunk(
  "attendance/processLeave",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PATCH", `/leaves/${id}/process`, data);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.leave;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const attendanceSlice = createSlice({
  name: "attendance",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyAttendance.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMyAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendance = action.payload;
      })
      .addCase(fetchMyAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(checkInAction.fulfilled, (state, action) => {
        state.attendance.unshift(action.payload);
      })
      .addCase(checkOutAction.fulfilled, (state, action) => {
        const index = state.attendance.findIndex(a => a._id === action.payload._id);
        if (index !== -1) state.attendance[index] = action.payload;
      })
      .addCase(fetchSalaryReport.fulfilled, (state, action) => {
        state.salaryReport = action.payload;
      })
      .addCase(fetchCompanyDetails.fulfilled, (state, action) => {
          state.companyDetails = action.payload;
      })
      .addCase(updateOfficeLocation.fulfilled, (state, action) => {
          state.companyDetails = action.payload;
      })
      .addCase(fetchLeaves.fulfilled, (state, action) => {
          state.leaves = action.payload;
      })
      .addCase(applyLeave.fulfilled, (state, action) => {
          state.leaves.unshift(action.payload);
      })
      .addCase(processLeave.fulfilled, (state, action) => {
          const index = state.leaves.findIndex(l => l._id === action.payload._id);
          if (index !== -1) state.leaves[index] = action.payload;
      });
  },
});

export default attendanceSlice.reducer;
