import axios from "axios";
import { BASE_URL } from "./apis";

import { toast } from "react-hot-toast";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Add Interceptor for Global Error Handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.subscriptionExpired) {
      toast.error(error.response.data.message || "Subscription Expired. Please renew to continue.");
    }
    return Promise.reject(error);
  }
);

export const apiConnector = (
  method,
  url,
  bodyData = null,
  headers = {},
  params = null,
  config = {} 
) => {
  const isFormData = bodyData instanceof FormData;
  const finalHeaders = isFormData
    ? headers
    : { "Content-Type": "application/json", ...headers };
  const token = localStorage.getItem("teamflow_token");

  return axiosInstance({
    method: method,
    url: url,
    data: bodyData || undefined,
    headers: {
      ...finalHeaders,
      Authorization: token ? `Bearer ${token}` : "",
    },
    params: params || undefined,
    ...config,
  });
};
