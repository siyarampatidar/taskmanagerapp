import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { projectEndpoints } from "../../Services/apis";
import { apiConnector } from "../../Services/apiConnector";

const initialState = {
  projects: [],
  loading: false,
  error: null,
};

export const fetchProjects = createAsyncThunk(
  "project/fetchProjects",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", projectEndpoints.GET_PROJECTS_API);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.projects;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createProject = createAsyncThunk(
  "project/createProject",
  async (projectData, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", projectEndpoints.CREATE_PROJECT_API, projectData);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.project;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.projects.unshift(action.payload);
      });
  },
});

export default projectSlice.reducer;
