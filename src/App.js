import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './Pages/Auth';
import Dashboard from './Pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
