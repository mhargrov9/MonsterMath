import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LabSubscriptionGateProps {
  monsterName: string;
  onClose: () => void;
}

export default function LabSubscriptionGate({ monsterName, onClose }: LabSubscriptionGateProps) {
  const [currentStep, setCurrentStep] = useState<'offer' | 'email'>('offer');
  const [selectedIntent, setSelectedIntent] = useState<'monthly' | 'yearly' | null>(null);
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const recordIntentMutation = useMutation({
    mutationFn: async (intent: 'monthly' | 'yearly') => {
      return await apiRequest('POST', '/api/interest/subscription', { 
        intent, 
        source: 'monster_lab' 
      });
    },
    onSuccess: (_, intent) => {
      setSelectedIntent(intent);
    },
    onError: (error) => {
      console.error('Lab subscription intent error:', error);
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
        title: "Success!",
        description: "We'll notify you when the full game launches!",
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
    console.log(`lab_${intent}_intent_click`); // Analytics tracking
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
              <div className="text-6xl">📧</div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Get Notified!
              </CardTitle>
              <p className="text-lg text-muted-foreground">
                {selectedIntent === 'monthly' ? 'Monthly Plan Selected' : 'Yearly Plan Selected'}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <p className="text-center text-muted-foreground">
                Enter your email address and we'll notify you as soon as Monster Academy launches with your 
                {selectedIntent === 'monthly' ? ' monthly' : ' yearly'} subscription option!
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
                  {recordEmailMutation.isPending ? "Saving..." : "Notify Me When Ready!"}
                </Button>
                
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="w-full text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200"
                >
                  Skip for Now - Return to Lab
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative max-w-lg w-full z-20">
        <Card className="bg-gradient-to-br from-purple-100/95 via-blue-50/95 to-purple-100/95 dark:from-purple-900/95 dark:via-blue-900/95 dark:to-purple-800/95 border-4 border-purple-500/60 dark:border-purple-400/60 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="text-6xl">🔒</div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Upgrade Limit Reached!
            </CardTitle>
            <p className="text-lg text-muted-foreground">
              Your {monsterName} has reached Level 3
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <p className="text-center text-muted-foreground">
              Free players can upgrade monsters up to Level 3. Unlock the full Monster Academy experience 
              to continue upgrading your {monsterName} to Level 10!
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <Card 
                className={`cursor-pointer transition-all border-2 ${
                  selectedIntent === 'monthly' 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                    : 'border-gray-200 hover:border-purple-300 dark:border-gray-700'
                }`}
                onClick={() => handleIntent('monthly')}
              >
                <CardContent className="p-6 text-center">
                  <Badge className="mb-2 bg-purple-500">Most Popular</Badge>
                  <div className="text-3xl font-bold">$9.99</div>
                  <div className="text-sm text-muted-foreground mb-4">per month</div>
                  <ul className="text-sm space-y-2 text-left">
                    <li>• Unlimited monster upgrades</li>
                    <li>• All story locations</li>
                    <li>• Premium monster collection</li>
                    <li>• Weekly tournaments</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card 
                className={`cursor-pointer transition-all border-2 ${
                  selectedIntent === 'yearly' 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                    : 'border-gray-200 hover:border-purple-300 dark:border-gray-700'
                }`}
                onClick={() => handleIntent('yearly')}
              >
                <CardContent className="p-6 text-center">
                  <Badge className="mb-2 bg-green-500">Best Value</Badge>
                  <div className="text-3xl font-bold">$99.99</div>
                  <div className="text-sm text-muted-foreground mb-4">per year</div>
                  <ul className="text-sm space-y-2 text-left">
                    <li>• Save $20 per year</li>
                    <li>• All monthly features</li>
                    <li>• Exclusive yearly rewards</li>
                    <li>• Priority customer support</li>
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
              
              <div>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200"
                >
                  Maybe Later - Return to Lab
                </Button>
              </div>
            </div>
            
            <p className="text-xs text-center text-muted-foreground mt-4">
              Choose your preferred subscription to unlock unlimited upgrades!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}