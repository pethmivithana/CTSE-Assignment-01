
import './App.css';

// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import RestaurantPage from './pages/RestaurantPage';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import CheckoutCompletePage from './pages/CheckoutCompletePage';
import OrdersPage from './pages/OrdersPage';
import OrderTrackPage from './pages/OrderTrackPage';
import PaymentsHistoryPage from './pages/PaymentsHistoryPage';
import PayPalReturnPage from './pages/PayPalReturnPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import EditProfilePage from './pages/EditProfilePage';
import AddressManagementPage from './pages/AddressManagementPage';
import SavedRestaurantsPage from './pages/SavedRestaurantsPage';
import FavoritesPage from './pages/FavoritesPage';
import DietaryPreferencesPage from './pages/DietaryPreferencesPage';
import SessionsPage from './pages/SessionsPage';
import AccountDeactivatePage from './pages/AccountDeactivatePage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import AdminDashboard from './pages/AdminDashboard';
import RestaurantDashboard from './pages/RestaurantDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <Router>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/restaurants" element={<RestaurantPage />} />
                  <Route path="/restaurants/:id" element={<MenuPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/checkout/complete" element={<CheckoutCompletePage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/orders/track/:orderId" element={<OrderTrackPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/profile/edit" element={<EditProfilePage />} />
                  <Route path="/profile/payments" element={<PaymentsHistoryPage />} />
                  <Route path="/profile/addresses" element={<AddressManagementPage />} />
                  <Route path="/profile/saved-restaurants" element={<SavedRestaurantsPage />} />
                  <Route path="/profile/favorites" element={<FavoritesPage />} />
                  <Route path="/profile/dietary-preferences" element={<DietaryPreferencesPage />} />
                  <Route path="/profile/sessions" element={<SessionsPage />} />
                  <Route path="/profile/deactivate" element={<AccountDeactivatePage />} />
                  <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/restaurant/dashboard" element={<RestaurantDashboard />} />
                  <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </Router>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
