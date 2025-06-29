import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Question, Subject } from "@/types/game";

const fetchApiJson = async (path: string) => {
    const res = await fetch(path);
    if (!res.ok) {
        // For 404s (no more questions), we don't want to throw an error, just return null.
        if (res.status === 404) return null;
        throw new Error(`Request to ${path} failed with status ${res.status}`);
    }
    // Handle cases where the response might be empty
    const text = await res.text();
    return text ? JSON.parse(text) : null;
};

export default function LearningSystem() {
  const [selectedSubject, setSelectedSubject] = useState<Subject>("mixed");
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showHint, setShowHint] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: question, isLoading, refetch } = useQuery<Question | null>({
    queryKey: ["/api/questions", selectedSubject],
    queryFn: () => fetchApiJson(`/api/questions?subject=${selectedSubject}&difficulty=2`),
    refetchOnWindowFocus: false,
  });

  const answerMutation = useMutation({
    mutationFn: async ({ answer, questionId, isCorrect, goldReward }: { answer: string, questionId: number, isCorrect: boolean, goldReward: number }) => {
      return apiRequest("/api/questions/answer", {
        method: 'POST',
        data: {
          questionId,
          isCorrect,
          goldReward: isCorrect ? goldReward : 0,
        }
      });
    },
    onSuccess: (data, variables) => {
      if (variables.isCorrect) {
        toast({
          title: "Correct! 🎉",
          description: `You earned ${variables.goldReward} Gold!`,
          className: "bg-lime-green text-white",
        });
      } else {
        toast({
          title: "Incorrect ❌",
          description: "Try again! You can do it!",
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      handleNewQuestion();
    },
    onError: (error) => {
        toast({
            title: "Error",
            description: `Could not submit answer. ${error.message}`,
            variant: "destructive",
        });
    }
  });

  const handleAnswerSelect = (answer: string) => {
    if (!question) return;
    setSelectedAnswer(answer);
    const isCorrect = answer === question.correctAnswer;
    answerMutation.mutate({ answer, questionId: question.id, isCorrect, goldReward: question.goldReward });
  };

  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject);
    setSelectedAnswer("");
    setShowHint(false);
    setUsedHint(false);
    queryClient.removeQueries({ queryKey: ["/api/questions"] });
    setTimeout(() => {
        queryClient.prefetchQuery({ queryKey: ["/api/questions", subject] });
    }, 100);
  }

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

  useEffect(() => {
    // Reset state when subject changes
    setSelectedAnswer("");
    setShowHint(false);
    setUsedHint(false);
  }, [selectedSubject]);


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
            onClick={() => handleSubjectSelect("math")}
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
            onClick={() => handleSubjectSelect("spelling")}
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
            onClick={() => handleSubjectSelect("mixed")}
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
      {question ? (
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

            {showHint && question.hint && (
              <div className="bg-bright-orange/20 border border-bright-orange rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 text-center">
                <p className="text-gray-700 font-medium text-sm sm:text-base">
                  💡 Hint: {question.hint}
                </p>
              </div>
            )}

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

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center">
              <Button
                onClick={handleGetHint}
                disabled={!question.hint || showHint || answerMutation.isPending}
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
      ) : (
        <Card className="bg-white/10 border-white/20"><CardContent className="p-6 text-center"><p className="text-white/80 font-semibold">No more questions available in this category. Try another one!</p></CardContent></Card>
      )}
    </div>
  );
}