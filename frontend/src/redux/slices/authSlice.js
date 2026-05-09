import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authEndpoints, employeeEndpoints, companyEndpoints } from "../../Services/apis";
import { apiConnector } from "../../Services/apiConnector";

const safeGetString = (key) => {
  const item = localStorage.getItem(key);
  return (item && item !== "undefined") ? item : null;
};

const safeGetJSON = (key) => {
  const item = localStorage.getItem(key);
  if (!item || item === "undefined") return null;
  try {
    return JSON.parse(item);
  } catch (e) {
    return null;
  }
};

const safeSetItem = (key, value) => {
  if (value === undefined || value === null) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
};

const initialState = {
  user: safeGetJSON("teamflow_user"),
  token: safeGetString("teamflow_token"),
  loading: false,
  error: null,
};

export const login = createAsyncThunk(
  "auth/login",
  async (loginData, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", authEndpoints.LOGIN_API, loginData);
      
      safeSetItem("teamflow_token", res.data.token);
      safeSetItem("teamflow_user", res.data.user);
      
      return res.data;
    } catch (err) {
      if (err.response?.data?.token) {
        safeSetItem("teamflow_token", err.response.data.token);
        safeSetItem("teamflow_user", err.response.data.user || null);
        return err.response.data; // Treat as success for the sake of redirection
      }
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const register = createAsyncThunk(
  "auth/register",
  async (regData, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", authEndpoints.REGISTER_API, regData);
      
      safeSetItem("teamflow_token", res.data.token);
      safeSetItem("teamflow_user", res.data.user);
      
      return res.data;
    } catch (err) {
      if (err.response?.data?.token) {
        safeSetItem("teamflow_token", err.response.data.token);
        safeSetItem("teamflow_user", err.response.data.user || null);
        return err.response.data;
      }
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const selectPlan = createAsyncThunk(
  "auth/selectPlan",
  async (planData, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", authEndpoints.SELECT_PLAN_API, planData);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const getUserProfile = createAsyncThunk(
  "auth/getUserProfile",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", authEndpoints.GET_ME_API);
      if (!res.data.success) return rejectWithValue(res.data.message);
      
      safeSetItem("teamflow_user", res.data.user);
      return res.data.user;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (profileData, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PUT", employeeEndpoints.UPDATE_PROFILE_API, profileData);
      if (!res.data.success) return rejectWithValue(res.data.message);
      
      safeSetItem("teamflow_user", res.data.user);
      return res.data.user;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const changePassword = createAsyncThunk(
  "auth/changePassword",
  async (passwordData, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PUT", employeeEndpoints.CHANGE_PASSWORD_API, passwordData);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async (email, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", authEndpoints.FORGOT_PASSWORD_API, { email });
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ token, password }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", authEndpoints.RESET_PASSWORD_API(token), { password });
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateCompanyDetails = createAsyncThunk(
  "auth/updateCompanyDetails",
  async (companyData, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PATCH", companyEndpoints.UPDATE_COMPANY_API, companyData);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.company;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { dispatch }) => {
    try {
      await apiConnector("POST", authEndpoints.LOGOUT_API);
    } catch (err) {
      console.error("Logout API failed", err);
    } finally {
      dispatch(logout()); // Existing logout reducer
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem("teamflow_token");
      localStorage.removeItem("teamflow_user");
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getUserProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(updateCompanyDetails.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCompanyDetails.fulfilled, (state, action) => {
        state.loading = false;
        if (state.user) {
          state.user.companyId = action.payload;
          safeSetItem("teamflow_user", state.user);
        }
      })
      .addCase(updateCompanyDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setLoading, setToken, setUser, logout, clearError } = authSlice.actions;
export default authSlice.reducer;
