import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SoundProvider } from './SoundContext';
import Hero from './Hero';
import Login from './Login';
import DashboardSetup from './DashboardSetup';
import SanctuaryDashboard from './SanctuaryDashboard';

function App() {
  return (
    <SoundProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login />} />
          <Route path="/dashboard" element={<DashboardSetup />} />
          <Route path="/sanctuary" element={<SanctuaryDashboard />} />
        </Routes>
      </Router>
    </SoundProvider>
  );
}

export default App;
