import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface InterestTestProps {
  onComplete: () => void;
}

export default function InterestTest({ onComplete }: InterestTestProps) {
  const [currentStep, setCurrentStep] = useState<'offer' | 'email'>('offer');
  const [selectedIntent, setSelectedIntent] = useState<'monthly' | 'yearly' | null>(null);
  const [email, setEmail] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const recordIntentMutation = useMutation({
    mutationFn: async (intent: 'monthly' | 'yearly') => {
      await apiRequest('/api/interest/subscription', 'POST', { intent });
    },
    onSuccess: (_, intent) => {
      setSelectedIntent(intent);
      setCurrentStep('email');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record preference. Please try again.",
        variant: "destructive",
      });
    },
  });

  const recordEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest('/api/interest/email', 'POST', { email });
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "We'll notify you when the full game launches!",
      });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubscriptionChoice = (intent: 'monthly' | 'yearly') => {
    recordIntentMutation.mutate(intent);
  };

  const handleEmailSubmit = () => {
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    recordEmailMutation.mutate(email);
  };

  if (currentStep === 'offer') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Offer Screen */}
        <Card className="bg-gradient-to-br from-purple-100 via-blue-50 to-purple-100 dark:from-purple-900 dark:via-blue-900 dark:to-purple-800 border-4 border-purple-500/60 dark:border-purple-400/60 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="text-6xl">⚔️</div>
            </div>
            <CardTitle className="text-3xl font-serif font-bold text-purple-800 dark:text-purple-200 mb-2">
              The Adventure Awaits!
            </CardTitle>
            <h2 className="text-xl font-serif text-purple-700 dark:text-purple-300">
              Unlock the Full Game
            </h2>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-lg text-slate-700 dark:text-slate-300 font-serif leading-relaxed">
                Continue your epic journey through all three ancient locations. Battle legendary monsters, 
                unlock powerful abilities, and discover the secrets needed to defeat Vorvax once and for all!
              </p>
            </div>

            <div className="grid gap-4 mt-8">
              <Button
                onClick={() => handleSubscriptionChoice('monthly')}
                disabled={recordIntentMutation.isPending}
                className="h-16 text-lg font-serif bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 hover:from-emerald-700 hover:via-green-700 hover:to-emerald-700 text-white border-2 border-emerald-400 shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold">Subscribe Monthly</span>
                  <span className="text-sm opacity-90">$9.99/month</span>
                </div>
              </Button>

              <Button
                onClick={() => handleSubscriptionChoice('yearly')}
                disabled={recordIntentMutation.isPending}
                className="h-16 text-lg font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 text-white border-2 border-purple-400 shadow-lg transform hover:scale-105 transition-all duration-200 relative"
              >
                <Badge className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs">
                  Save 17%
                </Badge>
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold">Subscribe Yearly</span>
                  <span className="text-sm opacity-90">$99/year</span>
                </div>
              </Button>
            </div>

            <div className="text-center mt-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 font-serif">
                ✨ Full access to all chapters, monsters, and epic storylines ✨
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email Capture Screen
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="bg-gradient-to-br from-green-100 via-emerald-50 to-green-100 dark:from-green-900 dark:via-emerald-900 dark:to-green-800 border-4 border-green-500/60 dark:border-green-400/60 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="text-6xl">🎉</div>
          </div>
          <CardTitle className="text-3xl font-serif font-bold text-green-800 dark:text-green-200 mb-2">
            Thank You For Your Interest!
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-lg text-slate-700 dark:text-slate-300 font-serif leading-relaxed mb-4">
              Monster Academy is launching soon with the complete adventure! We'll notify you the moment 
              it's ready so you can continue your quest to defeat Vorvax.
            </p>
            
            {selectedIntent && (
              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-600 mb-4">
                {selectedIntent === 'monthly' ? 'Monthly Plan Selected' : 'Yearly Plan Selected (Save 17%)'}
              </Badge>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-serif font-medium text-slate-700 dark:text-slate-300 mb-2">
                Enter your email address:
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="text-lg h-12 border-2 border-green-300 dark:border-green-600 focus:border-green-500 dark:focus:border-green-400"
                disabled={recordEmailMutation.isPending}
              />
            </div>

            <Button
              onClick={handleEmailSubmit}
              disabled={recordEmailMutation.isPending || !email}
              className="w-full h-14 text-lg font-serif bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-700 hover:via-emerald-700 hover:to-green-700 text-white border-2 border-green-400 shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              {recordEmailMutation.isPending ? (
                <span>Saving...</span>
              ) : (
                <span>🔔 Notify Me!</span>
              )}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400 font-serif">
              We'll only email you about Monster Academy. No spam, we promise! 
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}