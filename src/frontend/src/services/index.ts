/* eslint-disable no-param-reassign */
import axios, { AxiosInstance } from 'axios';
import { toast } from 'react-toastify';

const { API_URL_V1, BASE_URL } = process.env;

export const baseURL = BASE_URL;
export const apiURL = API_URL_V1;

export const api = axios.create({
  baseURL: API_URL_V1,
  timeout: 5 * 60 * 1000,
  headers: {
    accept: 'application/json',
    'Content-Type': 'multipart/form-data',
  },
});

// This interceptor is required to set token on request
function requestInterceptorFunction(config: any): any {
  const token = localStorage.getItem('token');
  // eslint-disable-next-line no-param-reassign
  config.headers['Access-Token'] = `${token}`;
  return config;
}

api.interceptors.request.use(requestInterceptorFunction);
api.interceptors.response.use(
  response => response,
  async responseError => {
    // handle token expire or invalid token case
    const originalRequest = responseError.config;
    if (
      responseError.response.status === 401 &&
      responseError.response.data.detail === 'Access token not valid' &&
      // eslint-disable-next-line no-underscore-dangle
      !originalRequest._retry
    ) {
      // eslint-disable-next-line no-underscore-dangle
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh');

      if (refreshToken) {
        try {
          const response = await axios.get(`${BASE_URL}/users/refresh-token`, {
            headers: { 'access-token': refreshToken },
          });
          const newAccessToken = response.data.access_token;
          localStorage.setItem('token', newAccessToken); // set new access token
          originalRequest.headers['Access-Token'] = `${newAccessToken}`;
          return axios(originalRequest); // recall Api with new token1
        } catch (error: any) {
          toast.error('Session Expired. Please Re-login.');
          localStorage.removeItem('token');
          localStorage.removeItem('refresh');
          window.location.href = '/';
          return Promise.reject(responseError);
        }
      }
    }
    // eslint-disable-next-line prefer-promise-reject-errors
    return Promise.reject({ ...responseError });
  },
);

export const authenticated = (apiInstance: AxiosInstance) => {
  const token = localStorage.getItem('token');
  if (!token) return apiInstance;
  if (process.env.NODE_ENV === 'development') {
    apiInstance.defaults.headers.common['Access-Token'] = `${token}`;
  } else {
    apiInstance.defaults.headers.common['Access-Token'] = `${token}`;
    apiInstance.defaults.withCredentials = false;
  }
  return apiInstance;
};
