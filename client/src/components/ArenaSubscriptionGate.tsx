import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ArenaSubscriptionGateProps {
  onClose: () => void;
}

export default function ArenaSubscriptionGate({ onClose }: ArenaSubscriptionGateProps) {
  const [currentStep, setCurrentStep] = useState<'offer' | 'email'>('offer');
  const [selectedIntent, setSelectedIntent] = useState<'monthly' | 'yearly' | null>(null);
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const recordIntentMutation = useMutation({
    mutationFn: async (intent: 'monthly' | 'yearly') => {
      return await apiRequest('POST', '/api/interest/subscription', { 
        intent, 
        source: 'arena' 
      });
    },
    onSuccess: (_, intent) => {
      setSelectedIntent(intent);
    },
    onError: (error) => {
      console.error('Arena subscription intent error:', error);
      toast({
        title: "Selection Recorded Locally",
        description: "We'll save your preference when you proceed.",
      });
    },
  });

  const recordEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest('POST', '/api/interest/email', { email });
    },
    onSuccess: () => {
      toast({
        title: "You're on the list!",
        description: "We'll notify you the moment Primal Rift goes live (and send you a code for a special launch-day monster!)!",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleIntent = (intent: 'monthly' | 'yearly') => {
    setSelectedIntent(intent);
    recordIntentMutation.mutate(intent);
    console.log(`arena_${intent}_intent_click`); // Analytics tracking
  };

  const handleEmailSubmit = () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    recordEmailMutation.mutate(email.trim());
  };

  // Email Capture Screen
  if (currentStep === 'email') {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="relative max-w-lg w-full z-20">
          <Card className="bg-gradient-to-br from-purple-100/95 via-blue-50/95 to-purple-100/95 dark:from-purple-900/95 dark:via-blue-900/95 dark:to-purple-800/95 border-4 border-purple-500/60 dark:border-purple-400/60 shadow-2xl">
            <CardHeader className="text-center space-y-4">
              <div className="text-6xl">🎉</div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Thank You For Your Interest!
              </CardTitle>
              <p className="text-lg text-muted-foreground">
                {selectedIntent === 'monthly' ? 'Monthly Plan Selected' : 'Yearly Plan Selected'}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <p className="text-center text-muted-foreground">
                Primal Rift is in the final stages of development. Enter your email below, and we'll notify you the moment it goes live (and send you a code for a special launch-day monster!)
              </p>
              
              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-center text-lg p-4"
                />
                
                <Button 
                  onClick={handleEmailSubmit}
                  disabled={recordEmailMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-12 py-4 text-lg"
                >
                  {recordEmailMutation.isPending ? "Saving..." : "Notify Me!"}
                </Button>
                
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="w-full text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200"
                >
                  Skip for Now - Return to Arena
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Subscription Offer Screen
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative max-w-4xl w-full z-20">
        <Card className="bg-gradient-to-br from-purple-100/95 via-blue-50/95 to-purple-100/95 dark:from-purple-900/95 dark:via-blue-900/95 dark:to-purple-800/95 border-4 border-purple-500/60 dark:border-purple-400/60 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="text-6xl">⚔️</div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Battle Arena - Premium Access
            </CardTitle>
            <p className="text-lg text-muted-foreground">
              You've used all your free battle tokens! Upgrade to continue battling.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-8">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold">Free Trial Limit Reached</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Free players get 5 battle tokens that refresh every 24 hours. Upgrade to Primal Rift Premium for unlimited battles, exclusive monsters, and special abilities!
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Monthly Plan */}
              <Card 
                className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                  selectedIntent === 'monthly' 
                    ? 'ring-4 ring-purple-500 shadow-lg' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => handleIntent('monthly')}
              >
                <CardContent className="p-6 text-center space-y-4">
                  <Badge variant="secondary" className="text-sm">Most Popular</Badge>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-bold">Monthly Plan</h4>
                    <p className="text-3xl font-bold text-purple-600">$9.99</p>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </div>
                  <ul className="text-sm space-y-2 text-left">
                    <li>✓ Unlimited battle tokens</li>
                    <li>✓ Exclusive premium monsters</li>
                    <li>✓ Advanced upgrade options</li>
                    <li>✓ Priority customer support</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Yearly Plan */}
              <Card 
                className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                  selectedIntent === 'yearly' 
                    ? 'ring-4 ring-purple-500 shadow-lg' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => handleIntent('yearly')}
              >
                <CardContent className="p-6 text-center space-y-4">
                  <Badge variant="default" className="bg-green-600 text-sm">Best Value</Badge>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-bold">Yearly Plan</h4>
                    <p className="text-3xl font-bold text-purple-600">$99</p>
                    <p className="text-sm text-muted-foreground">per year</p>
                    <p className="text-xs text-green-600 font-medium">Save $20 vs Monthly!</p>
                  </div>
                  <ul className="text-sm space-y-2 text-left">
                    <li>✓ Everything in Monthly</li>
                    <li>✓ Exclusive yearly monsters</li>
                    <li>✓ Bonus starter pack</li>
                    <li>✓ Early access to new features</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-8 text-center space-y-3">
              <Button
                onClick={() => setCurrentStep('email')}
                disabled={!selectedIntent}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-12 py-4 text-lg"
              >
                Continue with {selectedIntent === 'monthly' ? 'Monthly' : 'Yearly'} Plan
              </Button>
              
              <div className="text-xs text-muted-foreground">
                No payment required now - this is just for early access notifications
              </div>
              
              <Button
                onClick={onClose}
                variant="ghost"
                className="w-full text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200"
              >
                Maybe Later - Return to Arena
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}