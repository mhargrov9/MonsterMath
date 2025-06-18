import { useState, useMemo } from "react";
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

  // Monster images for background collage
  const monsterImages = useMemo(() => {
    const allMonsters = [
      // Gigalith levels 1-10
      '/api/monsters/6/image?level=1', '/api/monsters/6/image?level=2', '/api/monsters/6/image?level=3',
      '/api/monsters/6/image?level=4', '/api/monsters/6/image?level=5', '/api/monsters/6/image?level=6',
      '/api/monsters/6/image?level=7', '/api/monsters/6/image?level=8', '/api/monsters/6/image?level=9',
      '/api/monsters/6/image?level=10',
      // Aetherion levels 1-10
      '/api/monsters/7/image?level=1', '/api/monsters/7/image?level=2', '/api/monsters/7/image?level=3',
      '/api/monsters/7/image?level=4', '/api/monsters/7/image?level=5', '/api/monsters/7/image?level=6',
      '/api/monsters/7/image?level=7', '/api/monsters/7/image?level=8', '/api/monsters/7/image?level=9',
      '/api/monsters/7/image?level=10',
      // Geode Tortoise levels 1-3
      '/api/monsters/8/image?level=1', '/api/monsters/8/image?level=2', '/api/monsters/8/image?level=3',
      // Gale-Feather Griffin levels 1-3
      '/api/monsters/9/image?level=1', '/api/monsters/9/image?level=2', '/api/monsters/9/image?level=3',
      // Cinder-Tail Salamander levels 1-3
      '/api/monsters/10/image?level=1', '/api/monsters/10/image?level=2', '/api/monsters/10/image?level=3',
      // River-Spirit Axolotl levels 1-3
      '/api/monsters/11/image?level=1', '/api/monsters/11/image?level=2', '/api/monsters/11/image?level=3',
      // Spark-Tail Squirrel levels 1-3
      '/api/monsters/12/image?level=1', '/api/monsters/12/image?level=2', '/api/monsters/12/image?level=3'
    ];
    
    // Shuffle and select random subset for collage
    const shuffled = [...allMonsters].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 12); // Use 12 random monster images
  }, []);

  // Generate background collage style
  const collageStyle = useMemo(() => {
    const positions = [
      { top: '5%', left: '5%', transform: 'rotate(-15deg) scale(0.8)', opacity: 0.3 },
      { top: '10%', right: '8%', transform: 'rotate(12deg) scale(0.7)', opacity: 0.25 },
      { top: '25%', left: '12%', transform: 'rotate(-8deg) scale(0.9)', opacity: 0.35 },
      { top: '35%', right: '15%', transform: 'rotate(20deg) scale(0.6)', opacity: 0.28 },
      { top: '50%', left: '8%', transform: 'rotate(-25deg) scale(0.75)', opacity: 0.32 },
      { top: '60%', right: '10%', transform: 'rotate(18deg) scale(0.85)', opacity: 0.26 },
      { bottom: '20%', left: '15%', transform: 'rotate(-12deg) scale(0.7)', opacity: 0.34 },
      { bottom: '10%', right: '12%', transform: 'rotate(25deg) scale(0.8)', opacity: 0.3 },
      { top: '15%', left: '40%', transform: 'rotate(-18deg) scale(0.6)', opacity: 0.22 },
      { top: '45%', left: '45%', transform: 'rotate(22deg) scale(0.9)', opacity: 0.28 },
      { bottom: '30%', left: '50%', transform: 'rotate(-10deg) scale(0.7)', opacity: 0.32 },
      { top: '70%', right: '40%', transform: 'rotate(15deg) scale(0.8)', opacity: 0.24 }
    ];

    return monsterImages.map((image, index) => ({
      backgroundImage: `url(${image})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'absolute' as const,
      width: '120px',
      height: '120px',
      borderRadius: '50%',
      ...positions[index],
      zIndex: 1
    }));
  }, [monsterImages]);

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
      <div className="max-w-2xl mx-auto space-y-6 relative min-h-screen">
        {/* Monster Collage Background */}
        {monsterImages.slice(0, 12).map((imageUrl, index) => {
          const position = collageStyle[index];
          if (!position) return null;
          
          return (
            <img 
              key={index}
              src={imageUrl.replace('?level=', '?level=')}
              alt=""
              className="fixed pointer-events-none z-0 rounded-full object-cover"
              style={{
                top: position.top,
                left: position.left,
                right: position.right,
                bottom: position.bottom,
                transform: position.transform,
                opacity: position.opacity,
                width: '120px',
                height: '120px'
              }}
              onLoad={() => console.log('Monster image loaded:', imageUrl)}
              onError={(e) => console.log('Monster image failed:', imageUrl)}
            />
          );
        })}
        
        {/* Offer Screen */}
        <Card className="relative bg-gradient-to-br from-purple-100/80 via-blue-50/80 to-purple-100/80 dark:from-purple-900/80 dark:via-blue-900/80 dark:to-purple-800/80 border-4 border-purple-500/60 dark:border-purple-400/60 shadow-2xl z-10">
          {/* Content Overlay */}
          <div className="relative z-20">
            <CardHeader className="text-center pb-4 bg-white/90 dark:bg-gray-900/90 rounded-t-lg">
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
            
            <CardContent className="space-y-6 bg-white/90 dark:bg-gray-900/90 rounded-b-lg">
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
          </div>
        </Card>
      </div>
    );
  }

  // Email Capture Screen
  return (
    <div className="max-w-2xl mx-auto space-y-6 relative min-h-screen">
      {/* Monster Collage Background */}
      {monsterImages.slice(0, 12).map((imageUrl, index) => {
        const position = collageStyle[index];
        if (!position) return null;
        
        return (
          <img 
            key={index}
            src={imageUrl.replace('?level=', '?level=')}
            alt=""
            className="fixed pointer-events-none z-0 rounded-full object-cover"
            style={{
              top: position.top,
              left: position.left,
              right: position.right,
              bottom: position.bottom,
              transform: position.transform,
              opacity: (position.opacity as number) * 1.2,
              width: '120px',
              height: '120px'
            }}
            onLoad={() => console.log('Monster image loaded:', imageUrl)}
            onError={(e) => console.log('Monster image failed:', imageUrl)}
          />
        );
      })}
      
      <Card className="relative bg-gradient-to-br from-green-100/80 via-emerald-50/80 to-green-100/80 dark:from-green-900/80 dark:via-emerald-900/80 dark:to-green-800/80 border-4 border-green-500/60 dark:border-green-400/60 shadow-2xl z-10">
        {/* Content Overlay */}
        <div className="relative z-20">
          <CardHeader className="text-center pb-4 bg-white/90 dark:bg-gray-900/90 rounded-t-lg">
            <div className="flex justify-center mb-4">
              <div className="text-6xl">🎉</div>
            </div>
            <CardTitle className="text-3xl font-serif font-bold text-green-800 dark:text-green-200 mb-2">
              Thank You For Your Interest!
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6 bg-white/90 dark:bg-gray-900/90 rounded-b-lg">
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
        </div>
      </Card>
    </div>
  );
}