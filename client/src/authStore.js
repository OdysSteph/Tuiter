import { createSignal, createEffect } from 'solid-js';

const [currentUser, setCurrentUser] = createSignal(null);
const [isAuthenticated, setIsAuthenticated] = createSignal(false);

const isLoggedIn = () => isAuthenticated();

// Periksa status autentikasi saat halaman dimuat
async function checkAuthStatus() {
  try {
    const response = await fetch('http://localhost:3001/api/auth/check', {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.authenticated) {
      setCurrentUser(data.user);
      setIsAuthenticated(true);
    } else {
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  } catch (error) {
    console.error('Failed to check auth status:', error);
    setCurrentUser(null);
    setIsAuthenticated(false);
  }
}

async function loginUser(username, password) {
  try {
    const response = await fetch('http://localhost:3001/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    
    if (response.ok) {
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      return { success: true };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'Network error. Please try again.' };
  }
}

async function logoutUser() {
  try {
    const response = await fetch('http://localhost:3001/api/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
}

function updateCurrentUserDetails(newDetails) {
  setCurrentUser(prev => {
    if (!prev) return null;
    return { ...prev, ...newDetails };
  });
}

// Periksa status autentikasi saat modul dimuat
checkAuthStatus();

export { currentUser, isLoggedIn, loginUser, logoutUser, updateCurrentUserDetails, checkAuthStatus, isAuthenticated };