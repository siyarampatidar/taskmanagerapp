import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { billingEndpoints } from "../../Services/apis";
import { apiConnector } from "../../Services/apiConnector";
import { toast } from "react-hot-toast";

const initialState = {
  invoices: [],
  currentInvoice: null,
  stats: null,
  loading: false,
};

export const fetchInvoices = createAsyncThunk(
  "billing/fetchInvoices",
  async (params = {}, { rejectWithValue }) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString 
        ? `${billingEndpoints.GET_INVOICES_API}?${queryString}`
        : billingEndpoints.GET_INVOICES_API;
      const res = await apiConnector("GET", url);
      return res.data.invoices;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createInvoice = createAsyncThunk(
  "billing/createInvoice",
  async (data, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", billingEndpoints.CREATE_INVOICE_API, data);
      return res.data.invoice;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchInvoiceById = createAsyncThunk(
  "billing/fetchInvoiceById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", billingEndpoints.GET_INVOICE_BY_ID_API(id));
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const addPayment = createAsyncThunk(
  "billing/addPayment",
  async (data, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", billingEndpoints.ADD_PAYMENT_API, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchBillingStats = createAsyncThunk(
  "billing/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", billingEndpoints.GET_BILLING_STATS_API);
      return res.data.stats;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const billingSlice = createSlice({
  name: "billing",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = action.payload;
      })
      .addCase(fetchInvoices.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchInvoiceById.fulfilled, (state, action) => {
        state.currentInvoice = action.payload;
      })
      .addCase(fetchBillingStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export default billingSlice.reducer;
