// Custom authentication API service

interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  } | null;
  error?: string;
}

interface SignupRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
}

export const authAPI = {
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      // Replace this with your actual API endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { user: null, error: errorData.message || 'Login failed' };
      }

      const data = await response.json();
      
      // Store JWT token if your API returns one
      if (data.token) {
        localStorage.setItem('auth-token', data.token);
      }

      return { user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      return { user: null, error: 'Network error occurred' };
    }
  },

  async signup(userData: SignupRequest): Promise<LoginResponse> {
    try {
      // Replace this with your actual API endpoint
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { user: null, error: errorData.message || 'Signup failed' };
      }

      const data = await response.json();
      
      // Store JWT token if your API returns one
      if (data.token) {
        localStorage.setItem('auth-token', data.token);
      }

      return { user: data.user };
    } catch (error) {
      console.error('Signup error:', error);
      return { user: null, error: 'Network error occurred' };
    }
  },

  async logout(): Promise<void> {
    try {
      // Call your logout endpoint if needed
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('auth-token');
    }
  },

  async getCurrentUser(): Promise<LoginResponse> {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        return { user: null };
      }

      // Replace this with your actual API endpoint
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Token might be expired or invalid
        localStorage.removeItem('auth-token');
        return { user: null };
      }

      const data = await response.json();
      return { user: data.user };
    } catch (error) {
      console.error('Get current user error:', error);
      localStorage.removeItem('auth-token');
      return { user: null };
    }
  },

  async githubLogin(): Promise<LoginResponse> {
    try {
      // Redirect to your GitHub OAuth endpoint
      window.location.href = '/api/auth/github';
      return { user: null }; // Will redirect before this returns
    } catch (error) {
      console.error('GitHub login error:', error);
      return { user: null, error: 'GitHub login failed' };
    }
  }
};