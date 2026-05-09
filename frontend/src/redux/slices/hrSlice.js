import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { employeeEndpoints, departmentEndpoints, authEndpoints, leaveEndpoints } from "../../Services/apis";
import { apiConnector } from "../../Services/apiConnector";

const initialState = {
  employees: [],
  departments: [],
  leaves: [],
  pendingLeaves: [],
  loading: false,
  error: null,
};

export const fetchLeaves = createAsyncThunk(
  "hr/fetchLeaves",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", leaveEndpoints.GET_LEAVES_API);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.leaves;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const applyLeave = createAsyncThunk(
  "hr/applyLeave",
  async (leaveData, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", leaveEndpoints.APPLY_LEAVE_API, leaveData);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.leave;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const processLeave = createAsyncThunk(
  "hr/processLeave",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PATCH", leaveEndpoints.PROCESS_LEAVE_API(id), data);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.leave;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchPendingLeaves = createAsyncThunk(
  "hr/fetchPendingLeaves",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", leaveEndpoints.GET_PENDING_LEAVES_API);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.leaves;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchEmployees = createAsyncThunk(
  "hr/fetchEmployees",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", employeeEndpoints.GET_ALL_EMPLOYEES_API);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.employees;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchDepartments = createAsyncThunk(
  "hr/fetchDepartments",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", departmentEndpoints.GET_DEPARTMENTS_API);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.departments;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createDepartment = createAsyncThunk(
  "hr/createDepartment",
  async (deptData, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", departmentEndpoints.CREATE_DEPARTMENT_API, deptData);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.department;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const inviteEmployee = createAsyncThunk(
  "hr/inviteEmployee",
  async (empData, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", authEndpoints.INVITE_EMPLOYEE_API, empData);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteEmployee = createAsyncThunk(
  "hr/deleteEmployee",
  async (id, { rejectWithValue }) => {
    try {
      const res = await apiConnector("DELETE", `${employeeEndpoints.GET_ALL_EMPLOYEES_API}/${id}`);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteDepartment = createAsyncThunk(
  "hr/deleteDepartment",
  async (id, { rejectWithValue }) => {
    try {
      const res = await apiConnector("DELETE", departmentEndpoints.DELETE_DEPARTMENT_API(id));
      if (!res.data.success) return rejectWithValue(res.data.message);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateDepartment = createAsyncThunk(
  "hr/updateDepartment",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PUT", departmentEndpoints.UPDATE_DEPARTMENT_API(id), data);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.department;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateEmployee = createAsyncThunk(
  "hr/updateEmployee",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PUT", `${employeeEndpoints.GET_ALL_EMPLOYEES_API}/${id}`, data);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.user;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const hrSlice = createSlice({
  name: "hr",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchDepartments.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.loading = false;
        state.departments = action.payload || [];
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createDepartment.fulfilled, (state, action) => {
        state.departments.push(action.payload);
      })
      .addCase(deleteDepartment.fulfilled, (state, action) => {
        state.departments = state.departments.filter(d => d._id !== action.payload);
      })
      .addCase(updateDepartment.fulfilled, (state, action) => {
        const index = state.departments.findIndex(d => d._id === action.payload._id);
        if (index !== -1) state.departments[index] = action.payload;
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        const index = state.employees.findIndex(e => e._id?.toString() === action.payload._id?.toString());
        if (index !== -1) state.employees[index] = action.payload;
      })
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.employees = state.employees.filter(e => e._id !== action.payload);
      })
      .addCase(fetchLeaves.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchLeaves.fulfilled, (state, action) => {
        state.loading = false;
        state.leaves = action.payload || [];
      })
      .addCase(fetchLeaves.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(applyLeave.fulfilled, (state, action) => {
        state.leaves.unshift(action.payload);
      })
      .addCase(processLeave.fulfilled, (state, action) => {
        const index = state.leaves.findIndex(l => l._id === action.payload._id);
        if (index !== -1) state.leaves[index] = action.payload;
      })
      .addCase(fetchPendingLeaves.fulfilled, (state, action) => {
        state.pendingLeaves = action.payload || [];
      });
  },
});

export default hrSlice.reducer;
