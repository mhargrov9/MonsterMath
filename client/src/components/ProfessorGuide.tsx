export default function ProfessorGuide() {
  return (
    <div className="mb-8 relative">
      <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border-2 border-vibrant-purple/50">
        <div className="flex items-start space-x-4">
          {/* Professor Quibble character */}
          <div className="w-24 h-24 bg-gradient-to-br from-lime-green to-bright-orange rounded-full flex items-center justify-center animate-bounce-slow">
            <i className="fas fa-user-tie text-3xl text-white"></i>
          </div>
          <div className="flex-1">
            <div className="bg-white rounded-2xl p-4 relative shadow-xl">
              <div className="absolute -left-2 top-4 w-4 h-4 bg-white rotate-45"></div>
              <h3 className="font-fredoka text-vibrant-purple text-xl mb-2">Professor Quibble</h3>
              <p className="text-gray-700">
                Welcome back, Monster Trainer! Ready to earn some Gold by solving questions? 
                Your monsters are getting stronger! 🧪⚡
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
