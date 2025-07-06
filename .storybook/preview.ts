import type { Preview } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import '../client/src/index.css';

// Create a query client for Storybook
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { 
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
    mutations: { 
      retry: false,
    },
  },
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-background text-foreground">
            <Story />
            <Toaster />
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    ),
  ],
};

export default preview;