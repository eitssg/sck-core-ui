// filepath: d:\Development\simple-cloud-kit-oss\simple-cloud-kit\sck-core-ui\src\components\loading\PageLoader.tsx
interface PageLoaderProps {
  type?: 'dashboard' | 'form' | 'list' | 'default';
}

export const PageLoader = ({ type = 'default' }: PageLoaderProps) => {
  const content = {
    dashboard: (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    ),
    form: (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    ),
    list: (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    ),
    default: (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  };

  return content[type];
};
