/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import MainMenu from './pages/MainMenu';
import CreateEvent from './pages/CreateEvent';
import EditEvent from './pages/EditEvent';
import Agenda from './pages/Agenda';
import Reportes from './pages/Reportes';
import Gastos from './pages/Gastos';
import AjustesEvento from './pages/AjustesEvento';
import { useEffect, useState } from 'react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // 🔐 Validar token al cargar la app
  useEffect(() => {
    const validateToken = () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();

        if (isExpired) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      } catch (error) {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      }
    };

    validateToken();

    // Escucha cambios entre pestañas
    const handleStorageChange = () => validateToken();
    window.addEventListener('storage', handleStorageChange);

    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-orange-50 via-orange-100/50 to-amber-100/50 text-gray-900 font-sans overflow-x-hidden">
      {/* Fondo decorativo */}
      <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-orange-300/20 rounded-full blur-3xl mix-blend-multiply pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-96 h-96 bg-amber-300/20 rounded-full blur-3xl mix-blend-multiply pointer-events-none z-0" />

      <div className="relative z-10 min-h-screen">
        <Toaster position="top-center" />

        <Routes>
          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <Login setAuth={setIsAuthenticated} />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          <Route
            path="/"
            element={
              isAuthenticated ? (
                <MainMenu setAuth={setIsAuthenticated} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          <Route
            path="/create-event"
            element={isAuthenticated ? <CreateEvent /> : <Navigate to="/login" />}
          />

          <Route
            path="/edit-event/:id"
            element={isAuthenticated ? <EditEvent /> : <Navigate to="/login" />}
          />

          <Route
            path="/agenda"
            element={isAuthenticated ? <Agenda /> : <Navigate to="/login" />}
          />

          <Route
            path="/gastos"
            element={isAuthenticated ? <Gastos /> : <Navigate to="/login" />}
          />

          <Route
            path="/ajustes-evento"
            element={isAuthenticated ? <AjustesEvento /> : <Navigate to="/login" />}
          />

          <Route
            path="/reportes"
            element={isAuthenticated ? <Reportes /> : <Navigate to="/login" />}
          />
        </Routes>
      </div>
    </div>
  );
}