import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Question, Subject } from "@/types/game";

export default function LearningSystem() {
  const [selectedSubject, setSelectedSubject] = useState<Subject>("mixed");
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showHint, setShowHint] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const { toast } = useToast();

  const { data: question, isLoading, refetch } = useQuery<Question>({
    queryKey: ["/api/questions", selectedSubject, 2],
    queryFn: async () => {
      const response = await fetch(`/api/questions?subject=${selectedSubject}&difficulty=2`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch question");
      return response.json();
    },
  });

  const answerMutation = useMutation({
    mutationFn: async ({ answer, isCorrect }: { answer: string; isCorrect: boolean }) => {
      const response = await apiRequest("POST", "/api/questions/answer", {
        questionId: question?.id,
        answer,
        isCorrect,
        usedHint,
        subject: selectedSubject,
        difficulty: 2
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.isCorrect) {
        toast({
          title: "Correct! 🎉",
          description: `You earned ${data.goldEarned} Gold!`,
          className: "bg-lime-green text-white",
        });

        // If there's a next question, update the cache with it
        if (data.nextQuestion) {
          queryClient.setQueryData(["/api/questions", selectedSubject, 2], data.nextQuestion);
        } else {
          // No more questions available, refetch to potentially reset
          refetch();
        }
      } else {
        toast({
          title: "Incorrect ❌",
          description: "Try again! You can do it!",
          variant: "destructive",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setSelectedAnswer("");
      setShowHint(false);
      setUsedHint(false);
    },
  });

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    const isCorrect = answer === question?.correctAnswer;
    answerMutation.mutate({ answer, isCorrect });
  };

  const handleNewQuestion = () => {
    setSelectedAnswer("");
    setShowHint(false);
    setUsedHint(false);
    refetch();
  };

  const handleGetHint = () => {
    setShowHint(true);
    setUsedHint(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="animate-pulse">
            <div className="h-4 bg-white/20 rounded w-1/4 mb-4"></div>
            <div className="h-8 bg-white/20 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Subject Selection */}
      <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20">
        <h3 className="font-fredoka text-xl sm:text-2xl text-white mb-3 sm:mb-4">Choose Your Challenge</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Button
            onClick={() => {
              setSelectedSubject("math");
              setSelectedAnswer("");
              setShowHint(false);
              setUsedHint(false);
            }}
            className={`p-3 sm:p-4 rounded-xl font-bold hover:scale-105 transition-transform touch-manipulation ${
              selectedSubject === "math"
                ? "bg-gradient-to-r from-bright-orange to-gold-yellow text-white"
                : "bg-gradient-to-r from-bright-orange/50 to-gold-yellow/50 text-white"
            }`}
          >
            <i className="fas fa-calculator text-lg sm:text-2xl mb-1 sm:mb-2 block"></i>
            Math Magic
          </Button>

          <Button
            onClick={() => {
              setSelectedSubject("spelling");
              setSelectedAnswer("");
              setShowHint(false);
              setUsedHint(false);
            }}
            className={`p-3 sm:p-4 rounded-xl font-bold hover:scale-105 transition-transform touch-manipulation ${
              selectedSubject === "spelling"
                ? "bg-gradient-to-r from-vibrant-purple to-electric-blue text-white"
                : "bg-gradient-to-r from-vibrant-purple/50 to-electric-blue/50 text-white"
            }`}
          >
            <i className="fas fa-spell-check text-lg sm:text-2xl mb-1 sm:mb-2 block"></i>
            Spelling Spells
          </Button>

          <Button
            onClick={() => {
              setSelectedSubject("mixed");
              setSelectedAnswer("");
              setShowHint(false);
              setUsedHint(false);
            }}
            className={`p-3 sm:p-4 rounded-xl font-bold hover:scale-105 transition-transform touch-manipulation ${
              selectedSubject === "mixed"
                ? "bg-gradient-to-r from-lime-green to-diamond-blue text-white"
                : "bg-gradient-to-r from-lime-green/50 to-diamond-blue/50 text-white"
            }`}
          >
            <i className="fas fa-magic text-lg sm:text-2xl mb-1 sm:mb-2 block"></i>
            Mixed Mode
          </Button>
        </div>
      </div>

      {/* Current Question Card */}
      {question && (
        <Card className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-4 border-electric-blue">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="text-center mb-4 sm:mb-6">
              <div className="inline-flex items-center space-x-2 bg-gold-yellow/20 px-3 sm:px-4 py-2 rounded-full">
                <i className="fas fa-star text-gold-yellow text-sm sm:text-base"></i>
                <span className="font-bold text-gray-700 text-sm sm:text-base">
                  Question Worth: <span className="text-gold-yellow">{question.goldReward} Gold</span>
                </span>
              </div>
            </div>

            <div className="text-center mb-6 sm:mb-8">
              <h4 className="font-fredoka text-xl sm:text-2xl lg:text-3xl text-gray-800 mb-3 sm:mb-4">
                {question.questionText}
              </h4>
              <div className="w-24 h-1 bg-gradient-to-r from-electric-blue to-vibrant-purple mx-auto rounded-full"></div>
            </div>

            {/* Show hint if requested */}
            {showHint && question.hint && (
              <div className="bg-bright-orange/20 border border-bright-orange rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 text-center">
                <p className="text-gray-700 font-medium text-sm sm:text-base">
                  💡 Hint: {question.hint}
                </p>
              </div>
            )}

            {/* Answer Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {question.options.map((option, index) => (
                <Button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={answerMutation.isPending}
                  className="bg-gray-100 hover:bg-electric-blue hover:text-white p-3 sm:p-4 rounded-xl font-bold text-base sm:text-lg transition-all border-2 border-transparent hover:border-electric-blue text-gray-800 touch-manipulation min-h-[48px] sm:min-h-[56px]"
                >
                  {String.fromCharCode(65 + index)}) {option}
                </Button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center">
              <Button
                onClick={handleGetHint}
                disabled={showHint || answerMutation.isPending}
                className="bg-bright-orange text-white px-4 sm:px-6 py-3 rounded-xl font-bold hover:bg-bright-orange/80 transition-colors touch-manipulation"
              >
                <i className="fas fa-lightbulb mr-2"></i>
                <span className="hidden sm:inline">Need a Hint?</span>
                <span className="sm:hidden">Hint</span>
              </Button>

              <Button
                onClick={handleNewQuestion}
                disabled={answerMutation.isPending}
                className="bg-lime-green text-white px-6 sm:px-8 py-3 rounded-xl font-bold hover:bg-lime-green/80 transition-colors touch-manipulation"
              >
                <i className="fas fa-arrow-right mr-2"></i>
                New Question
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Tracking */}
      <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-fredoka text-xl text-white">Today's Progress</h4>
          <span className="text-gold-yellow font-bold">Keep Learning! 🔥</span>
        </div>
        <div className="bg-white/20 rounded-full h-4 mb-2">
          <div className="bg-gradient-to-r from-lime-green to-gold-yellow h-4 rounded-full" style={{width: "70%"}}></div>
        </div>
        <div className="flex justify-between text-sm text-white/80">
          <span>Great progress today!</span>
          <span>Keep up the great work!</span>
        </div>
      </div>
    </div>
  );
}
