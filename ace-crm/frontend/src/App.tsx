import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from './contexts/QueryProvider';
import { AuthProvider } from './contexts/AuthProvider';
import { useWebSocket } from './hooks/useWebSocket';

// Component to initialize WebSocket connection
const WebSocketInitializer: React.FC = () => {
  useWebSocket(); // This will handle WebSocket connection lifecycle
  return null;
};

const App: React.FC = () => {
  return (
    <QueryProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            {/* WebSocket connection handler */}
            <WebSocketInitializer />
            
            {/* Toast notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#fff',
                  },
                },
                loading: {
                  iconTheme: {
                    primary: '#3B82F6',
                    secondary: '#fff',
                  },
                },
              }}
            />

            {/* Main application content will go here */}
            <div className="min-h-screen bg-gray-50">
              <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                  <h1 className="text-xl font-semibold text-gray-900">
                    ACE CRM - API Integration Layer Ready
                  </h1>
                </div>
              </header>
              
              <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                  <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        🚀 API Integration Layer Complete!
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-lg font-semibold text-green-600 mb-2">
                            ✅ API Client Setup
                          </h3>
                          <p className="text-gray-600">
                            Axios client with JWT auth, interceptors, and retry logic
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-lg font-semibold text-green-600 mb-2">
                            ✅ Service Modules
                          </h3>
                          <p className="text-gray-600">
                            Auth, Users, Contacts, Leads, Deals, Companies, Projects
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-lg font-semibold text-green-600 mb-2">
                            ✅ React Query Hooks
                          </h3>
                          <p className="text-gray-600">
                            Optimistic updates, caching, and error handling
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-lg font-semibold text-green-600 mb-2">
                            ✅ WebSocket Integration
                          </h3>
                          <p className="text-gray-600">
                            Real-time updates with automatic reconnection
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-lg font-semibold text-green-600 mb-2">
                            ✅ File Upload System
                          </h3>
                          <p className="text-gray-600">
                            Progress tracking, drag & drop, validation
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-lg font-semibold text-green-600 mb-2">
                            ✅ Error Management
                          </h3>
                          <p className="text-gray-600">
                            Global error handling with user-friendly messages
                          </p>
                        </div>
                      </div>
                      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                        <p className="text-blue-800">
                          <strong>Backend API:</strong> http://localhost:5000/api<br/>
                          <strong>WebSocket:</strong> http://localhost:5000<br/>
                          <strong>Authentication:</strong> JWT with refresh tokens
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </Router>
      </AuthProvider>
    </QueryProvider>
  );
};

export default App;