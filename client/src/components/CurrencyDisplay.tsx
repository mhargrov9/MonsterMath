import { GameUser } from "@/types/game";

interface CurrencyDisplayProps {
  user?: GameUser;
}

export default function CurrencyDisplay({ user }: CurrencyDisplayProps) {
  if (!user) {
    return (
      <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6">
        <div className="flex items-center space-x-1 sm:space-x-2 bg-gold-yellow/20 px-2 sm:px-3 lg:px-4 py-1 sm:py-2 rounded-full border-2 border-gold-yellow">
          <i className="fas fa-coins text-gold-yellow text-sm sm:text-base lg:text-lg"></i>
          <span className="text-white font-bold text-sm sm:text-base lg:text-lg">--</span>
          <span className="text-gold-yellow font-medium text-xs sm:text-sm lg:text-base hidden sm:inline">Gold</span>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2 bg-diamond-blue/20 px-2 sm:px-3 lg:px-4 py-1 sm:py-2 rounded-full border-2 border-diamond-blue">
          <i className="fas fa-gem text-diamond-blue text-sm sm:text-base lg:text-lg"></i>
          <span className="text-white font-bold text-sm sm:text-base lg:text-lg">--</span>
          <span className="text-diamond-blue font-medium text-xs sm:text-sm lg:text-base hidden sm:inline">Diamonds</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6">
      <div className="flex items-center space-x-1 sm:space-x-2 bg-gold-yellow/20 px-2 sm:px-3 lg:px-4 py-1 sm:py-2 rounded-full border-2 border-gold-yellow">
        <i className="fas fa-coins text-gold-yellow text-sm sm:text-base lg:text-lg"></i>
        <span className="text-white font-bold text-sm sm:text-base lg:text-lg">{user.gold.toLocaleString()}</span>
        <span className="text-gold-yellow font-medium text-xs sm:text-sm lg:text-base hidden sm:inline">Gold</span>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2 bg-diamond-blue/20 px-2 sm:px-3 lg:px-4 py-1 sm:py-2 rounded-full border-2 border-diamond-blue">
        <i className="fas fa-gem text-diamond-blue text-sm sm:text-base lg:text-lg"></i>
        <span className="text-white font-bold text-sm sm:text-base lg:text-lg">{user.diamonds.toLocaleString()}</span>
        <span className="text-diamond-blue font-medium text-xs sm:text-sm lg:text-base hidden sm:inline">Diamonds</span>
      </div>
    </div>
  );
}
