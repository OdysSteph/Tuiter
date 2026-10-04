import { Router, Route, Navigate } from '@solidjs/router';
import { Show, createEffect } from 'solid-js';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Timeline from './pages/Timeline';
import People from './pages/People';
import Post from './pages/Post';
import './index.css';
import { isLoggedIn, checkAuthStatus } from './authStore';

function ProtectedRoute(props) {
  return (
    <Show when={isLoggedIn()} fallback={<Navigate href="/login" />}>
      {props.children}
    </Show>
  );
}

function AuthRoute(props) {
  return (
    <Show when={!isLoggedIn()} fallback={<Navigate href="/timeline" />}>
      {props.children}
    </Show>
  );
}

export default function App() {
  // Periksa status autentikasi saat aplikasi dimuat
  createEffect(() => {
    checkAuthStatus();
  });

  return (
    <Router>
      <Route path="/" component={() => <Navigate href={isLoggedIn() ? "/timeline" : "/login"} />} />
      <Route path="/login" component={() => <AuthRoute><Login /></AuthRoute>} />
      <Route path="/register" component={() => <AuthRoute><Register /></AuthRoute>} />
      <Route path="/" component={Layout}>
        <Route path="timeline" component={() => <ProtectedRoute><Timeline /></ProtectedRoute>} />
        <Route path="post" component={() => <ProtectedRoute><Post /></ProtectedRoute>} />
        <Route path="people" component={() => <ProtectedRoute><People /></ProtectedRoute>} />
        <Route path="profile" component={() => <ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="profile/:userId" component={() => <ProtectedRoute><Profile /></ProtectedRoute>} />
      </Route>
      <Route path="*" component={() => <Navigate href={isLoggedIn() ? "/timeline" : "/login"} />} />
    </Router>
  );
}