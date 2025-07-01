import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import { useState, useEffect } from "react";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [serverStatus, setServerStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        if (response.ok && data.status === 'ok') {
          setServerStatus('ok');
        } else {
          setServerStatus('error');
        }
      } catch (error) {
        setServerStatus('error');
      }
    };

    checkServerHealth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        
        {/* Server status indicator */}
        <div
          className={`fixed bottom-4 right-4 w-3 h-3 rounded-full z-50 ${
            serverStatus === 'checking' 
              ? 'bg-gray-400' 
              : serverStatus === 'ok' 
              ? 'bg-green-500' 
              : 'bg-red-500'
          }`}
          title={`Server status: ${serverStatus}`}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
