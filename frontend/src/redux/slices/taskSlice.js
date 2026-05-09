import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { taskEndpoints } from "../../Services/apis";
import { apiConnector } from "../../Services/apiConnector";

const initialState = {
  tasks: [],
  archivedTasks: [],
  loading: false,
  error: null,
};

export const fetchTasks = createAsyncThunk(
  "tasks/fetchTasks",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", taskEndpoints.GET_TASKS_API);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.tasks;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createTask = createAsyncThunk(
  "tasks/createTask",
  async (taskData, { rejectWithValue }) => {
    try {
      // Handle FormData for attachments
      const isFormData = taskData instanceof FormData;
      const res = await apiConnector("POST", taskEndpoints.CREATE_TASK_API, taskData, 
        isFormData ? {} : { "Content-Type": "application/json" }
      );
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.task;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateTaskStatus = createAsyncThunk(
  "tasks/updateStatus",
  async ({ taskId, status }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PATCH", taskEndpoints.UPDATE_TASK_STATUS_API(taskId), { status });
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.task;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const transferTaskToDepartment = createAsyncThunk(
  "tasks/transferTask",
  async ({ taskId, deptId }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", taskEndpoints.TRANSFER_TASK_API(taskId), { deptId });
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.task;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const approveTaskState = createAsyncThunk(
  "tasks/approveState",
  async ({ taskId, approvalType, status }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", taskEndpoints.APPROVE_TASK_STATE_API(taskId), { approvalType, status });
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.task;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const reassignTask = createAsyncThunk(
  "tasks/reassign",
  async ({ taskId, assigneeId }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PUT", taskEndpoints.REASSIGN_TASK_API(taskId), { assigneeId });
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.task;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateSubTask = createAsyncThunk(
  "tasks/updateSubTask",
  async ({ taskId, subTaskId, isDone }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PATCH", `/tasks/${taskId}/subtasks/${subTaskId}`, { isDone });
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.task;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const acceptTask = createAsyncThunk(
  "tasks/acceptTask",
  async (taskId, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PATCH", taskEndpoints.ACCEPT_TASK_API(taskId));
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.task;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const rejectTask = createAsyncThunk(
  "tasks/rejectTask",
  async ({ taskId, reason }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PATCH", taskEndpoints.REJECT_TASK_API(taskId), { reason });
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.task;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchArchivedTasks = createAsyncThunk(
  "tasks/fetchArchivedTasks",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", taskEndpoints.GET_ARCHIVED_TASKS_API);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.tasks;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const restoreTask = createAsyncThunk(
  "tasks/restoreTask",
  async (taskId, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PATCH", taskEndpoints.RESTORE_TASK_API(taskId));
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.task;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteTask = createAsyncThunk(
  "tasks/deleteTask",
  async (taskId, { rejectWithValue }) => {
    try {
      const res = await apiConnector("DELETE", taskEndpoints.DELETE_TASK_API(taskId));
      if (!res.data.success) return rejectWithValue(res.data.message);
      return taskId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const addTaskAttachment = createAsyncThunk(
  "tasks/addAttachment",
  async ({ taskId, attachments }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      Array.from(attachments).forEach(f => formData.append('attachments', f));
      const res = await apiConnector("POST", taskEndpoints.ADD_TASK_ATTACHMENTS_API(taskId), formData);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.task;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const taskSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        const exists = state.tasks.some(t => t._id === action.payload._id);
        if (!exists) state.tasks.unshift(action.payload);
      })
      .addCase(updateSubTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(transferTaskToDepartment.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(approveTaskState.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(reassignTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(acceptTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(rejectTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(fetchArchivedTasks.fulfilled, (state, action) => {
        state.archivedTasks = action.payload;
      })
      .addCase(restoreTask.fulfilled, (state, action) => {
        state.archivedTasks = state.archivedTasks.filter(t => t._id !== action.payload._id);
        state.tasks.unshift(action.payload);
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter(t => t._id !== action.payload);
      })
      .addCase(addTaskAttachment.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      });
  },
});

export default taskSlice.reducer;
