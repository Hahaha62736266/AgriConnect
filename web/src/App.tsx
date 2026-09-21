import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ChatProvider } from './contexts/ChatContext';
// import { FloatingChatDock } from './components/chat/FloatingChatDock';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { MessagesPage } from './pages/MessagesPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { ProduceMarketplacePage } from './pages/ProduceMarketplacePage';
import { ManageProduceListingsPage } from './pages/ManageProduceListingsPage';
import { ProduceTransactionsPage } from './pages/ProduceTransactionsPage';
import { SupplyStorePage } from './pages/SupplyStorePage';
import { SupplyCartPage } from './pages/SupplyCartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ManageSupplyProductsPage } from './pages/ManageSupplyProductsPage';
import { SupplyOrdersPage } from './pages/SupplyOrdersPage';
import { MarketPriceMonitoringPage } from './pages/MarketPriceMonitoringPage';
import { ManageMarketPricesPage } from './pages/ManageMarketPricesPage';
import { FarmFinancialTrackerPage } from './pages/FarmFinancialTrackerPage';
import { GovernmentProgramsPage } from './pages/GovernmentProgramsPage';
import { ManageGovernmentProgramsPage } from './pages/ManageGovernmentProgramsPage';
import { CommunityHubPage } from './pages/CommunityHubPage';
import { CommunityPostDetailPage } from './pages/CommunityPostDetailPage';
import { LGUDashboardPage } from './pages/LGUDashboardPage';
import { SuperAdminApprovalsPage } from './pages/SuperAdminApprovalsPage';
import { LGUAccountApprovalsPage } from './pages/LGUAccountApprovalsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ChatProvider>
            {/* FloatingChatDock excluded from UI in all views as requested */}
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <DashboardPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <MessagesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProfilePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SettingsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Produce Marketplace */}
            <Route
              path="/produce"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProduceMarketplacePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/produce/manage"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ManageProduceListingsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/produce/orders"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProduceTransactionsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Agri-Supply Store */}
            <Route
              path="/supply"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SupplyStorePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/supply/cart"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SupplyCartPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SupplyCartPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CheckoutPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/supply/manage"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ManageSupplyProductsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/supply/orders"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SupplyOrdersPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Market Price Monitoring */}
            <Route
              path="/market-prices"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <MarketPriceMonitoringPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/price-trends"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <MarketPriceMonitoringPage initialTab="trends" />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/market-prices/manage"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ManageMarketPricesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Farm Financial Tracker */}
            <Route
              path="/finances"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <FarmFinancialTrackerPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Government Programs */}
            <Route
              path="/programs"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <GovernmentProgramsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/programs/manage"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ManageGovernmentProgramsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Community Hub */}
            <Route
              path="/community"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CommunityHubPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guides"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CommunityHubPage initialTab="guides" />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/community/posts/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CommunityPostDetailPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/community/post/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CommunityPostDetailPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* LGU Regional Monitoring Dashboard */}
            <Route
              path="/lgu/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <LGUDashboardPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Super Admin & LGU Account Approvals */}
            <Route
              path="/admin/approvals"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SuperAdminApprovalsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/lgu/approvals"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <LGUAccountApprovalsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ChatProvider>
      </ToastProvider>
    </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
