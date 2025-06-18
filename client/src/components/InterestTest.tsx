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
      { top: '2%', left: '2%', scale: 0.18, rotation: -8, opacity: 0.4 },
      { top: '2%', left: '20%', scale: 0.16, rotation: 6, opacity: 0.35 },
      { top: '2%', left: '38%', scale: 0.19, rotation: -12, opacity: 0.42 },
      { top: '2%', left: '56%', scale: 0.17, rotation: 10, opacity: 0.38 },
      { top: '2%', left: '74%', scale: 0.18, rotation: -5, opacity: 0.36 },
      { top: '2%', left: '92%', scale: 0.16, rotation: 8, opacity: 0.33 },
      
      // Second row
      { top: '22%', left: '2%', scale: 0.19, rotation: 12, opacity: 0.43 },
      { top: '22%', left: '20%', scale: 0.17, rotation: -15, opacity: 0.37 },
      { top: '22%', left: '38%', scale: 0.20, rotation: 9, opacity: 0.41 },
      { top: '22%', left: '56%', scale: 0.16, rotation: -18, opacity: 0.39 },
      { top: '22%', left: '74%', scale: 0.18, rotation: 14, opacity: 0.35 },
      { top: '22%', left: '92%', scale: 0.17, rotation: -7, opacity: 0.32 },
      
      // Third row
      { top: '42%', left: '2%', scale: 0.17, rotation: -6, opacity: 0.44 },
      { top: '42%', left: '20%', scale: 0.19, rotation: 16, opacity: 0.38 },
      { top: '42%', left: '38%', scale: 0.16, rotation: -11, opacity: 0.42 },
      { top: '42%', left: '56%', scale: 0.18, rotation: 7, opacity: 0.36 },
      { top: '42%', left: '74%', scale: 0.17, rotation: -14, opacity: 0.40 },
      { top: '42%', left: '92%', scale: 0.19, rotation: 13, opacity: 0.34 },
      
      // Fourth row
      { top: '62%', left: '2%', scale: 0.18, rotation: 11, opacity: 0.37 },
      { top: '62%', left: '20%', scale: 0.16, rotation: -9, opacity: 0.43 },
      { top: '62%', left: '38%', scale: 0.19, rotation: 5, opacity: 0.39 },
      { top: '62%', left: '56%', scale: 0.17, rotation: -16, opacity: 0.41 },
      { top: '62%', left: '74%', scale: 0.18, rotation: 8, opacity: 0.34 },
      { top: '62%', left: '92%', scale: 0.16, rotation: -4, opacity: 0.36 },
      
      // Fifth row
      { top: '82%', left: '2%', scale: 0.17, rotation: -10, opacity: 0.38 },
      { top: '82%', left: '20%', scale: 0.19, rotation: 15, opacity: 0.35 },
      { top: '82%', left: '38%', scale: 0.16, rotation: -3, opacity: 0.42 },
      { top: '82%', left: '56%', scale: 0.18, rotation: 12, opacity: 0.40 },
      { top: '82%', left: '74%', scale: 0.17, rotation: -8, opacity: 0.37 },
      { top: '82%', left: '92%', scale: 0.18, rotation: 6, opacity: 0.33 }
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
        {/* Monster Card Collage Background - Full Screen */}
        {monsterCollage.map((item, index) => (
          <div
            key={index}
            className="fixed pointer-events-none z-0"
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
        <div className="relative max-w-2xl w-full z-20">
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
    );
  }

  // Email Capture Screen
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Monster Card Collage Background - Full Screen */}
      {monsterCollage.map((item, index) => (
        <div
          key={index}
          className="fixed pointer-events-none z-0"
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
      <div className="relative max-w-2xl w-full z-20">
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
    );
}