// filepath: d:\Development\simple-cloud-kit-oss\simple-cloud-kit\sck-core-ui\src\utils\routeHelpers.tsx
import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { PageLoader } from '@/components/PageLoader';

// Helper to create lazy-loaded protected routes with explicit imports
export const createProtectedRoute = (
  path: string, 
  Component: React.LazyExoticComponent<React.ComponentType>, 
  loaderType: 'dashboard' | 'form' | 'list' | 'default' = 'default'
) => {
  return (
    <Route 
      path={path} 
      element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route 
        index 
        element={
          <Suspense fallback={<PageLoader type={loaderType} />}>
            <Component />
          </Suspense>
        } 
      />
    </Route>
  );
};

// Helper for public routes with explicit imports
export const createPublicRoute = (path: string, Component: React.LazyExoticComponent<React.ComponentType>) => {
  return (
    <Route 
      path={path} 
      element={
        <Suspense fallback={<PageLoader type="default" />}>
          <Component />
        </Suspense>
      } 
    />
  );
};
