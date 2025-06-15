import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const { toast } = useToast();

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/login/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        window.location.reload();
      } else {
        toast({
          title: "Login Failed",
          description: data.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Login Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Account Created!",
          description: "You can now log in with your new account.",
          variant: "default"
        });
        // Switch to login tab
        const loginTab = document.querySelector('[data-value="login"]') as HTMLElement;
        loginTab?.click();
      } else {
        toast({
          title: "Registration Failed",
          description: data.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Registration Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Monster Card Collage Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="grid grid-cols-8 gap-2 transform rotate-12 scale-150 -translate-y-20">
          <img src="/assets/Gigalith_Level_1_1749856385841.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Aetherion_Level_1_1749866902477.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Gigalith_Level_3_1749856409063.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Aetherion_Level_3_1749866902476.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Gigalith_Level_5_1749856409060.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Aetherion_Level_5_1749866902475.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Gigalith_Level_7_1749856409059.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Aetherion_Level_7_1749866902474.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          
          <img src="/assets/Aetherion_Level_2_1749866902476.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Gigalith_Level_2_1749856393905.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Aetherion_Level_4_1749866902475.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Gigalith_Level_4_1749856409062.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Aetherion_Level_6_1749866902475.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Gigalith_Level_6_1749856409059.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Aetherion_Level_8_1749866902474.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Gigalith_Level_8_1749856409058.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          
          <img src="/assets/Gigalith_Level_9_1749856409058.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Aetherion_Level_9_1749866902473.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Gigalith_Level_10_1749856409057.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Aetherion_Level_10_1749866902471.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Gigalith 1.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Aetherion 1.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Gigalith_Level_1_1749856385841.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
          <img src="/assets/Aetherion_Level_1_1749866902477.png" alt="" className="w-24 h-32 object-cover rounded-lg" />
        </div>
      </div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <h1 className="font-fredoka text-6xl text-white mb-4 animate-bounce-slow">
              🧪 Monster Academy 🧪
            </h1>
            <p className="text-xl text-white/80 mb-8">
              Educational Adventure Game for Monster Trainers!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white/10 backdrop-blur-sm border-2 border-electric-blue/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <i className="fas fa-graduation-cap text-lime-green"></i>
                  Learn & Earn
                </CardTitle>
                <CardDescription className="text-white/70">
                  Answer math and spelling questions to earn Gold and level up your monsters!
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-2 border-vibrant-purple/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <i className="fas fa-flask text-bright-orange"></i>
                  Monster Lab
                </CardTitle>
                <CardDescription className="text-white/70">
                  Buy and upgrade amazing creatures in Professor Quibble's laboratory!
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-2 border-gold-yellow/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <i className="fas fa-fist-raised text-diamond-blue"></i>
                  Battle Arena
                </CardTitle>
                <CardDescription className="text-white/70">
                  Challenge other trainers in epic monster battles to earn Diamonds!
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Card className="bg-white/15 backdrop-blur-sm border-2 border-white/20">
            <CardHeader>
              <CardTitle className="text-center font-fredoka text-3xl text-white">
                Ready to Begin Your Adventure?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-white/20">
                  <TabsTrigger value="login" data-value="login" className="text-white data-[state=active]:bg-electric-blue">Login</TabsTrigger>
                  <TabsTrigger value="register" className="text-white data-[state=active]:bg-electric-blue">Create Account</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-6">
                  <form onSubmit={handleLocalLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-username" className="text-white">Username</Label>
                      <Input
                        id="login-username"
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                        placeholder="Enter your username"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="login-password" className="text-white">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-electric-blue to-vibrant-purple text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform"
                    >
                      {isLoading ? "Logging in..." : "Enter the Academy"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="space-y-6">
                  <form onSubmit={handleRegistration} className="space-y-4">
                    <div>
                      <Label htmlFor="reg-username" className="text-white">Username</Label>
                      <Input
                        id="reg-username"
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                        placeholder="Choose a username"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="reg-email" className="text-white">Email</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="reg-password" className="text-white">Password</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                        placeholder="Choose a password (6+ characters)"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="reg-confirm" className="text-white">Confirm Password</Label>
                      <Input
                        id="reg-confirm"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                        placeholder="Confirm your password"
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-lime-green to-bright-orange text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform"
                    >
                      {isLoading ? "Creating Account..." : "Join the Academy"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="flex justify-center space-x-8 mt-8">
            <div className="w-16 h-20 bg-gradient-to-t from-lime-green/30 to-lime-green/60 rounded-full relative beaker-bubble animate-float"></div>
            <div className="w-16 h-20 bg-gradient-to-t from-electric-blue/30 to-electric-blue/60 rounded-full relative beaker-bubble animate-float" style={{animationDelay: "0.5s"}}></div>
            <div className="w-16 h-20 bg-gradient-to-t from-vibrant-purple/30 to-vibrant-purple/60 rounded-full relative beaker-bubble animate-float" style={{animationDelay: "1s"}}></div>
          </div>
        </div>
      </div>
    </div>
  );
}