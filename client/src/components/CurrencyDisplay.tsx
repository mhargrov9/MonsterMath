import { GameUser } from "@/types/game";

interface CurrencyDisplayProps {
  user?: GameUser;
}

export default function CurrencyDisplay({ user }: CurrencyDisplayProps) {
  if (!user) {
    return (
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 bg-gold-yellow/20 px-4 py-2 rounded-full border-2 border-gold-yellow">
          <i className="fas fa-coins text-gold-yellow text-lg"></i>
          <span className="text-white font-bold text-lg">--</span>
          <span className="text-gold-yellow font-medium">Gold</span>
        </div>
        <div className="flex items-center space-x-2 bg-diamond-blue/20 px-4 py-2 rounded-full border-2 border-diamond-blue">
          <i className="fas fa-gem text-diamond-blue text-lg"></i>
          <span className="text-white font-bold text-lg">--</span>
          <span className="text-diamond-blue font-medium">Diamonds</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-6">
      <div className="flex items-center space-x-2 bg-gold-yellow/20 px-4 py-2 rounded-full border-2 border-gold-yellow">
        <i className="fas fa-coins text-gold-yellow text-lg"></i>
        <span className="text-white font-bold text-lg">{user.gold.toLocaleString()}</span>
        <span className="text-gold-yellow font-medium">Gold</span>
      </div>
      <div className="flex items-center space-x-2 bg-diamond-blue/20 px-4 py-2 rounded-full border-2 border-diamond-blue">
        <i className="fas fa-gem text-diamond-blue text-lg"></i>
        <span className="text-white font-bold text-lg">{user.diamonds.toLocaleString()}</span>
        <span className="text-diamond-blue font-medium">Diamonds</span>
      </div>
    </div>
  );
}
