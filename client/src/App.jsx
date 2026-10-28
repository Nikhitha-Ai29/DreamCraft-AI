import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CustomerDashboard from './pages/customer/Dashboard';
import DreamStudio from './pages/customer/DreamStudio';
import AIChat from './pages/customer/AIChat';
import ArtisanDiscovery from './pages/customer/ArtisanDiscovery';
import ArtisanProfile from './pages/customer/ArtisanProfile';
import Orders from './pages/customer/Orders';
import OrderDetail from './pages/customer/OrderDetail';
import Quotations from './pages/customer/Quotations';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import ArtisanDashboard from './pages/artisan/ArtisanDashboard';
import ArtisanRequests from './pages/artisan/ArtisanRequests';
import ArtisanPortfolio from './pages/artisan/ArtisanPortfolio';
import ArtisanOrderDetail from './pages/artisan/ArtisanOrderDetail';

const CustomerLayout = ({ children }) => (
  <ProtectedRoute role="customer"><Layout>{children}</Layout></ProtectedRoute>
);
const ArtisanLayout = ({ children }) => (
  <ProtectedRoute role="artisan"><Layout>{children}</Layout></ProtectedRoute>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { borderRadius: '12px', fontSize: '14px' } }} />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Customer */}
          <Route path="/dashboard" element={<CustomerLayout><CustomerDashboard /></CustomerLayout>} />
          <Route path="/dream-studio" element={<CustomerLayout><DreamStudio /></CustomerLayout>} />
          <Route path="/ai-chat" element={<CustomerLayout><AIChat /></CustomerLayout>} />
          <Route path="/artisans" element={<CustomerLayout><ArtisanDiscovery /></CustomerLayout>} />
          <Route path="/artisans/:id" element={<CustomerLayout><ArtisanProfile /></CustomerLayout>} />
          <Route path="/orders" element={<CustomerLayout><Orders /></CustomerLayout>} />
          <Route path="/orders/:id" element={<CustomerLayout><OrderDetail /></CustomerLayout>} />
          <Route path="/quotations" element={<CustomerLayout><Quotations /></CustomerLayout>} />
          <Route path="/messages" element={<CustomerLayout><Messages /></CustomerLayout>} />
          <Route path="/profile" element={<CustomerLayout><Profile /></CustomerLayout>} />

          {/* Artisan */}
          <Route path="/artisan/dashboard" element={<ArtisanLayout><ArtisanDashboard /></ArtisanLayout>} />
          <Route path="/artisan/requests" element={<ArtisanLayout><ArtisanRequests /></ArtisanLayout>} />
          <Route path="/artisan/orders" element={<ArtisanLayout><Orders /></ArtisanLayout>} />
          <Route path="/artisan/orders/:id" element={<ArtisanLayout><ArtisanOrderDetail /></ArtisanLayout>} />
          <Route path="/artisan/portfolio" element={<ArtisanLayout><ArtisanPortfolio /></ArtisanLayout>} />
          <Route path="/artisan/messages" element={<ArtisanLayout><Messages /></ArtisanLayout>} />
          <Route path="/artisan/profile" element={<ArtisanLayout><Profile /></ArtisanLayout>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
