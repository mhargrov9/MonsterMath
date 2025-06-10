import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
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
          <CardContent className="text-center">
            <p className="text-white/80 mb-6 text-lg">
              Join Professor Quibble and start collecting monsters while mastering 4th-grade math and spelling!
            </p>
            <Button 
              onClick={handleLogin}
              className="bg-gradient-to-r from-lime-green to-electric-blue text-white text-xl px-8 py-4 rounded-xl font-bold hover:scale-105 transition-transform animate-pulse-glow"
            >
              <i className="fas fa-play mr-3"></i>
              Start Playing Now!
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-center space-x-8 mt-8">
          <div className="w-16 h-20 bg-gradient-to-t from-lime-green/30 to-lime-green/60 rounded-full relative beaker-bubble animate-float"></div>
          <div className="w-16 h-20 bg-gradient-to-t from-electric-blue/30 to-electric-blue/60 rounded-full relative beaker-bubble animate-float" style={{animationDelay: "0.5s"}}></div>
          <div className="w-16 h-20 bg-gradient-to-t from-vibrant-purple/30 to-vibrant-purple/60 rounded-full relative beaker-bubble animate-float" style={{animationDelay: "1s"}}></div>
        </div>
      </div>
    </div>
  );
}
