import { useState, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import MonsterCard from "./MonsterCard";

interface InterestTestProps {
  onComplete: () => void;
}

export default function InterestTest({ onComplete }: InterestTestProps) {
  const [currentStep, setCurrentStep] = useState<'offer' | 'email'>('offer');
  const [selectedIntent, setSelectedIntent] = useState<'monthly' | 'yearly' | null>(null);
  const [email, setEmail] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all monsters for collage
  const { data: monsters } = useQuery({
    queryKey: ['/api/monsters'],
  });

  // Create monster collage with varied levels and positions
  const monsterCollage = useMemo(() => {
    if (!monsters || !Array.isArray(monsters)) return [];
    
    const collageMonsters: Array<{
      monster: any;
      position: {
        top?: string;
        left?: string;
        right?: string;
        scale: number;
        rotation: number;
        opacity: number;
      };
    }> = [];
    
    const positions = [
      // Top row
      { top: '5%', left: '5%', scale: 0.3, rotation: -12, opacity: 0.4 },
      { top: '3%', left: '25%', scale: 0.28, rotation: 8, opacity: 0.35 },
      { top: '7%', left: '45%', scale: 0.32, rotation: -15, opacity: 0.42 },
      { top: '4%', left: '65%', scale: 0.29, rotation: 18, opacity: 0.38 },
      { top: '6%', left: '85%', scale: 0.27, rotation: -8, opacity: 0.36 },
      
      // Second row
      { top: '25%', left: '2%', scale: 0.31, rotation: 15, opacity: 0.43 },
      { top: '28%', left: '22%', scale: 0.26, rotation: -20, opacity: 0.37 },
      { top: '26%', left: '42%', scale: 0.33, rotation: 12, opacity: 0.41 },
      { top: '29%', left: '62%', scale: 0.28, rotation: -25, opacity: 0.39 },
      { top: '27%', left: '82%', scale: 0.30, rotation: 22, opacity: 0.35 },
      
      // Third row
      { top: '50%', left: '8%', scale: 0.29, rotation: -10, opacity: 0.44 },
      { top: '52%', left: '28%', scale: 0.32, rotation: 25, opacity: 0.38 },
      { top: '48%', left: '48%', scale: 0.27, rotation: -18, opacity: 0.42 },
      { top: '51%', left: '68%', scale: 0.31, rotation: 14, opacity: 0.36 },
      { top: '49%', left: '88%', scale: 0.28, rotation: -22, opacity: 0.40 },
      
      // Fourth row  
      { top: '72%', left: '5%', scale: 0.30, rotation: 20, opacity: 0.37 },
      { top: '75%', left: '25%', scale: 0.29, rotation: -15, opacity: 0.43 },
      { top: '73%', left: '45%', scale: 0.32, rotation: 10, opacity: 0.39 },
      { top: '76%', left: '65%', scale: 0.27, rotation: -28, opacity: 0.41 },
      { top: '74%', left: '85%', scale: 0.31, rotation: 16, opacity: 0.34 }
    ];

    // Use all available monsters with varied levels
    monsters.forEach((monster: any, index: number) => {
      if (index < positions.length) {
        const level = Math.floor(Math.random() * 3) + 1; // Random level 1-3
        collageMonsters.push({
          monster: { ...monster, level },
          position: positions[index]
        });
      }
    });

    return collageMonsters;
  }, [monsters]);

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

  const handleIntent = (intent: 'monthly' | 'yearly') => {
    recordIntentMutation.mutate(intent);
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

  if (currentStep === 'offer') {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="relative max-w-4xl w-full bg-gradient-to-br from-purple-900 via-blue-800 to-purple-900 rounded-3xl shadow-2xl overflow-hidden">
          {/* Monster Card Collage Background */}
          {monsterCollage.map((item, index) => (
            <div
              key={index}
              className="absolute pointer-events-none z-0"
              style={{
                top: item.position.top,
                left: item.position.left,
                right: item.position.right,
                transform: `rotate(${item.position.rotation}deg) scale(${item.position.scale})`,
                opacity: item.position.opacity
              }}
            >
              <MonsterCard monster={item.monster} />
            </div>
          ))}
          
          {/* Content Overlay */}
          <div className="relative z-20 p-8 max-h-[90vh] overflow-y-auto">
            <Card className="bg-gradient-to-br from-purple-100/95 via-blue-50/95 to-purple-100/95 dark:from-purple-900/95 dark:via-blue-900/95 dark:to-purple-800/95 border-4 border-purple-500/60 dark:border-purple-400/60 shadow-2xl">
              <CardHeader className="text-center space-y-4">
                <div className="text-6xl">⚔️</div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  The Adventure Awaits!
                </CardTitle>
                <p className="text-lg text-muted-foreground">
                  Unlock the Full Game
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <p className="text-center text-muted-foreground">
                  Continue your epic journey through all three ancient locations. Battle legendary monsters, 
                  collect rare treasures, and become the ultimate Monster Academy champion!
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
                        <li>• Unlimited monster battles</li>
                        <li>• All 3 story locations</li>
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
                
                <p className="text-xs text-center text-muted-foreground">
                  Choose your preferred subscription to continue your adventure!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Email Capture Screen
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative max-w-4xl w-full bg-gradient-to-br from-purple-900 via-blue-800 to-purple-900 rounded-3xl shadow-2xl overflow-hidden">
        {/* Monster Card Collage Background */}
        {monsterCollage.map((item, index) => (
          <div
            key={index}
            className="absolute pointer-events-none z-0"
            style={{
              top: item.position.top,
              left: item.position.left,
              right: item.position.right,
              transform: `rotate(${item.position.rotation}deg) scale(${item.position.scale})`,
              opacity: item.position.opacity
            }}
          >
            <MonsterCard monster={item.monster} />
          </div>
        ))}
        
        {/* Content Overlay */}
        <div className="relative z-20 p-8 max-h-[90vh] overflow-y-auto">
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
                  disabled={recordEmailMutation.isPending || !email.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white p-4 text-lg"
                >
                  {recordEmailMutation.isPending ? 'Saving...' : 'Notify Me!'}
                </Button>
              </div>
              
              <p className="text-xs text-center text-muted-foreground">
                We'll only email you when the game launches. No spam, we promise!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}