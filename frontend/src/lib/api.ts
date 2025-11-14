import axios, { AxiosError } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refreshToken,
          })

          const { accessToken, refreshToken: newRefreshToken } = response.data.data

          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', newRefreshToken)

          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  register: async (data: {
    email: string
    password: string
    firstName: string
    lastName: string
  }) => {
    const response = await api.post('/api/auth/register', data)
    return response.data
  },

  login: async (data: { email: string; password: string }) => {
    const response = await api.post('/api/auth/login', data)
    return response.data
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  },

  verifyEmail: async (token: string) => {
    const response = await api.get(`/api/auth/verify-email/${token}`)
    return response.data
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/api/auth/forgot-password', { email })
    return response.data
  },

  resetPassword: async (token: string, password: string) => {
    const response = await api.post('/api/auth/reset-password', { token, password })
    return response.data
  },
}

// Books API
export const booksAPI = {
  create: async (data: {
    title: string
    description: string
    storyPrompt: string
    illustrationStyle: string
    ageRange?: string
    language?: string
  }) => {
    const response = await api.post('/api/books', data)
    return response.data
  },

  generateStory: async (bookId: string) => {
    const response = await api.post(`/api/books/${bookId}/generate-story`)
    return response.data
  },

  generateImages: async (bookId: string) => {
    const response = await api.post(`/api/books/${bookId}/generate-images`)
    return response.data
  },

  getById: async (bookId: string) => {
    const response = await api.get(`/api/books/${bookId}`)
    return response.data
  },

  getMyBooks: async () => {
    const response = await api.get('/api/books/my/all')
    return response.data
  },

  getPublicBooks: async (page = 1, limit = 20) => {
    const response = await api.get('/api/books', {
      params: { page, limit },
    })
    return response.data
  },

  publish: async (bookId: string) => {
    const response = await api.post(`/api/books/${bookId}/publish`)
    return response.data
  },

  delete: async (bookId: string) => {
    const response = await api.delete(`/api/books/${bookId}`)
    return response.data
  },
}

// User API
export const userAPI = {
  getMe: async () => {
    const response = await api.get('/api/users/me')
    return response.data
  },

  updateMe: async (data: {
    firstName?: string
    lastName?: string
    avatarUrl?: string
  }) => {
    const response = await api.put('/api/users/me', data)
    return response.data
  },
}

// Subscriptions API
export const subscriptionsAPI = {
  createCheckout: async (priceId: string) => {
    const response = await api.post('/api/subscriptions/create-checkout', {
      priceId,
    })
    return response.data
  },

  createPortal: async () => {
    const response = await api.post('/api/subscriptions/portal')
    return response.data
  },
}

// AI API
export const aiAPI = {
  moderate: async (text: string) => {
    const response = await api.post('/api/ai/moderate', { text })
    return response.data
  },
}

export default api
