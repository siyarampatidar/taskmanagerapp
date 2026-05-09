import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { superAdminEndpoints } from "../../Services/apis";
import { apiConnector } from "../../Services/apiConnector";

const initialState = {
  plans: [],
  companies: [],
  stats: {
    totalRevenue: 0,
    totalCompanies: 0,
    activeCompanies: 0,
    totalPlans: 0
  },
  loading: false,
  error: null,
};

export const fetchPlans = createAsyncThunk(
  "superAdmin/fetchPlans",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", superAdminEndpoints.GET_PLANS_API);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.plans;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchCompanies = createAsyncThunk(
  "superAdmin/fetchCompanies",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", superAdminEndpoints.GET_ALL_COMPANIES_API);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.companies;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createPlan = createAsyncThunk(
  "superAdmin/createPlan",
  async (planData, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", superAdminEndpoints.CREATE_PLAN_API, planData);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.plan;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchStats = createAsyncThunk(
  "superAdmin/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", superAdminEndpoints.GET_STATS_API);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.stats;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const toggleCompanyStatus = createAsyncThunk(
  "superAdmin/toggleCompanyStatus",
  async (id, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PATCH", superAdminEndpoints.TOGGLE_COMPANY_STATUS_API(id));
      if (!res.data.success) return rejectWithValue(res.data.message);
      return { id, isActive: res.data.isActive };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updatePlan = createAsyncThunk(
  "superAdmin/updatePlan",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PATCH", `${superAdminEndpoints.GET_PLANS_API}/${id}`, data);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.plan;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deletePlan = createAsyncThunk(
  "superAdmin/deletePlan",
  async (id, { rejectWithValue }) => {
    try {
      const res = await apiConnector("DELETE", `${superAdminEndpoints.GET_PLANS_API}/${id}`);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const superAdminSlice = createSlice({
  name: "superAdmin",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlans.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPlans.fulfilled, (state, action) => {
        state.loading = false;
        state.plans = action.payload;
      })
      .addCase(fetchCompanies.fulfilled, (state, action) => {
        state.companies = action.payload;
      })
      .addCase(createPlan.fulfilled, (state, action) => {
        state.plans.push(action.payload);
      })
      .addCase(updatePlan.fulfilled, (state, action) => {
        const index = state.plans.findIndex(p => p._id === action.payload._id);
        if (index !== -1) state.plans[index] = action.payload;
      })
      .addCase(deletePlan.fulfilled, (state, action) => {
        state.plans = state.plans.filter(p => p._id !== action.payload);
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(toggleCompanyStatus.fulfilled, (state, action) => {
        const index = state.companies.findIndex(c => c._id === action.payload.id);
        if (index !== -1) {
          state.companies[index].isActive = action.payload.isActive;
        }
      });
  },
});

export default superAdminSlice.reducer;
