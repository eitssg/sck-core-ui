// filepath: d:\Development\simple-cloud-kit-oss\simple-cloud-kit\sck-core-ui\src\utils\routeHelpers.tsx
import { Route } from 'react-router-dom';
import { Suspense } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageLoader } from '@/components/PageLoader';

// Helper to create lazy-loaded protected routes with explicit imports
export const createProtectedRoute = (
  path: string, 
  Component: React.ComponentType<any>, 
  loaderType: 'dashboard' | 'form' | 'list' | 'default' = 'default'
) => (
  <Route
    key={path}
    path={path}
    element={
      <ProtectedRoute>
        <Suspense fallback={<PageLoader type={loaderType} />}>
          <Component />
        </Suspense>
      </ProtectedRoute>
    }
  />
);

// Helper for public routes with explicit imports
export const createPublicRoute = (
  path: string, 
  Component: React.ComponentType<any>
) => (
  <Route
    key={path}
    path={path}
    element={
      <Suspense fallback={<PageLoader type="default" />}>
        <Component />
      </Suspense>
    }
  />
);
