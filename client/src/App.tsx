import { Toaster } from "@/components/ui/toaster"
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/home";
import AuthPage from "@/pages/AuthPage";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
            <p className="text-center text-white">Loading Session...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {user ? <Home /> : <AuthPage />}
      <Toaster />
    </>
  )
}

export default App