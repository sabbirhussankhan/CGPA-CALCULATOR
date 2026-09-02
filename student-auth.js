/**
 * UU Student ERP Auth Module for CGPA Calculator
 * Verifies student credentials against Uttara University ERP via UU Bus backend API.
 */
(function (global) {
  'use strict';

  const TOKEN_KEY = 'uu_token';
  const PROFILE_KEY = 'uu_profile';
  const REMEMBERED_ID_KEY = 'uu_remembered_id';
  const API_BASE = 'https://uttarauniversity-bus-backend-1.onrender.com';

  const StudentAuth = {
    getApiBase() {
      return API_BASE;
    },

    getToken() {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
    },

    getProfile() {
      const data = localStorage.getItem(PROFILE_KEY) || sessionStorage.getItem(PROFILE_KEY);
      if (!data) return null;
      try {
        return JSON.parse(data);
      } catch (e) {
        return null;
      }
    },

    isLoggedIn() {
      return Boolean(this.getToken());
    },

    getRememberedId() {
      return localStorage.getItem(REMEMBERED_ID_KEY) || '';
    },

    storeLoginSession(data, rememberMe) {
      const storage = rememberMe ? localStorage : sessionStorage;
      if (data.token) {
        storage.setItem(TOKEN_KEY, data.token);
      }
      if (data.profile) {
        storage.setItem(PROFILE_KEY, JSON.stringify(data.profile));
      }
      if (rememberMe && data.profile && data.profile.id) {
        localStorage.setItem(REMEMBERED_ID_KEY, data.profile.id);
      } else if (!rememberMe) {
        localStorage.removeItem(REMEMBERED_ID_KEY);
      }
    },

    async login(studentId, password, rememberMe = false) {
      const cleanId = String(studentId || '').trim();
      const cleanPass = String(password || '').trim();

      if (!cleanId || !cleanPass) {
        return { success: false, message: 'Please enter both Student ID and Password.' };
      }

      try {
        if (window.location.protocol === 'file:') {
          return {
            success: false,
            message: 'Direct file:// access detected. The server requires opening this page via http://localhost (Live Server) or a web host for ERP verification. Use Demo Login for local testing.'
          };
        }

        const response = await fetch(API_BASE + '/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'omit',
          body: JSON.stringify({ studentId: cleanId, password: cleanPass, rememberMe })
        });

        const data = await response.json();
        if (data.success) {
          const profile = data.profile || { id: cleanId, name: cleanId };
          this.storeLoginSession({ token: data.token || 'uu_session_active', profile, isDemo: data.isDemo }, rememberMe);
          window.dispatchEvent(new CustomEvent('uu-auth-changed', { detail: { isLoggedIn: true, profile } }));
          return { success: true, profile, isDemo: data.isDemo };
        } else {
          if (data.message && data.message.includes('Untrusted login origin')) {
            return {
              success: false,
              message: 'Login blocked by server (Untrusted Origin). Open this page via http://localhost (or Live Server) or a web host for live ERP verification.'
            };
          }
          return { success: false, message: data.message || 'Invalid Student ID or Password' };
        }
      } catch (err) {
        console.error('[StudentAuth] Connection error:', err);
        return { 
          success: false, 
          message: 'Connection Error: Could not connect to Uttara University verification server. Check your network.' 
        };
      }
    },

    async loginDemo() {
      const demoProfile = { id: '2261091001', name: 'Demo Student', department: 'CSE' };
      this.storeLoginSession({ token: 'demo_session_token', profile: demoProfile, isDemo: true }, false);
      window.dispatchEvent(new CustomEvent('uu-auth-changed', { detail: { isLoggedIn: true, profile: demoProfile } }));
      return { success: true, profile: demoProfile, isDemo: true };
    },

    logout() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(PROFILE_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(PROFILE_KEY);
      window.dispatchEvent(new CustomEvent('uu-auth-changed', { detail: { isLoggedIn: false } }));
    }
  };

  global.StudentAuth = StudentAuth;
})(typeof window !== 'undefined' ? window : this);
