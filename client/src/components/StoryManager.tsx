import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

// Story node definitions for demo purposes
const STORY_NODES: Record<string, {
  title: string;
  description: string;
  content: string;
  choices: Array<{ text: string; nextNode: string; }>;
  location: string;
}> = {
  "Node_Start_01": {
    title: "Welcome to Monster Academy",
    description: "Your adventure begins at the academy gates",
    content: "You stand before the magnificent Monster Academy, its towers gleaming in the morning sun. Professor Quibble awaits you at the entrance, ready to begin your training as a Monster Trainer.",
    choices: [
      { text: "Enter the Academy", nextNode: "Node_Academy_Hall" },
      { text: "Explore the Grounds", nextNode: "Node_Academy_Grounds" }
    ],
    location: "Academy Gates"
  },
  "Node_Academy_Hall": {
    title: "The Great Hall",
    description: "The heart of Monster Academy",
    content: "The Great Hall bustles with activity. Students practice with their monster companions while professors demonstrate advanced techniques. Ancient tapestries depicting legendary monsters line the walls.",
    choices: [
      { text: "Visit the Monster Lab", nextNode: "Node_Monster_Lab" },
      { text: "Go to the Training Grounds", nextNode: "Node_Training_Grounds" },
      { text: "Return to Gates", nextNode: "Node_Start_01" }
    ],
    location: "Great Hall"
  },
  "Node_Academy_Grounds": {
    title: "Academy Grounds",
    description: "Peaceful gardens surrounding the academy",
    content: "The academy grounds are filled with beautiful gardens where wild monsters roam freely. You spot several rare creatures hiding among the magical flora.",
    choices: [
      { text: "Investigate the Strange Sounds", nextNode: "Node_Forest_01" },
      { text: "Return to the Academy", nextNode: "Node_Academy_Hall" }
    ],
    location: "Academy Grounds"
  },
  "Node_Monster_Lab": {
    title: "Professor Quibble's Laboratory",
    description: "Where monsters are studied and trained",
    content: "Professor Quibble's laboratory is filled with mysterious potions and ancient monster artifacts. 'Welcome, young trainer!' he exclaims. 'Are you ready to learn the secrets of monster care?'",
    choices: [
      { text: "Learn About Monster Care", nextNode: "Node_Monster_Training" },
      { text: "Ask About Rare Monsters", nextNode: "Node_Rare_Discovery" },
      { text: "Leave the Lab", nextNode: "Node_Academy_Hall" }
    ],
    location: "Monster Laboratory"
  },
  "Node_Training_Grounds": {
    title: "Monster Training Grounds",
    description: "Where battles and training take place",
    content: "The training grounds echo with the sounds of monster battles. Advanced students practice combat techniques while their monster companions demonstrate powerful abilities.",
    choices: [
      { text: "Join a Practice Battle", nextNode: "Node_Practice_Battle" },
      { text: "Watch from the Sidelines", nextNode: "Node_Observe_Training" },
      { text: "Return to Hall", nextNode: "Node_Academy_Hall" }
    ],
    location: "Training Grounds"
  },
  "Node_Forest_01": {
    title: "The Enchanted Forest",
    description: "Ancient woods filled with mystery",
    content: "You venture into the ancient forest surrounding the academy. The trees whisper secrets of old, and you sense powerful monsters lurking in the shadows.",
    choices: [
      { text: "Venture Deeper", nextNode: "Node_Forest_Deep" },
      { text: "Search for Items", nextNode: "Node_Forest_Items" },
      { text: "Return to Safety", nextNode: "Node_Academy_Grounds" }
    ],
    location: "Enchanted Forest"
  }
};

export default function StoryManager() {
  const [currentNode, setCurrentNode] = useState<string>("Node_Start_01");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current story progress
  const { data: progressData, isLoading } = useQuery<{ storyProgress: string }>({
    queryKey: ["/api/story/progress"],
  });

  // Update story progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (storyNode: string) => {
      await apiRequest("POST", "/api/story/progress", { storyNode });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/story/progress"] });
      toast({
        title: "Progress Saved",
        description: "Your adventure progress has been saved.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save progress.",
        variant: "destructive",
      });
    },
  });

  // Set current node when progress data loads
  useEffect(() => {
    if (progressData?.storyProgress) {
      setCurrentNode(progressData.storyProgress);
    }
  }, [progressData]);

  const handleChoice = (nextNode: string) => {
    setCurrentNode(nextNode);
    updateProgressMutation.mutate(nextNode);
  };

  const resetStory = () => {
    setCurrentNode("Node_Start_01");
    updateProgressMutation.mutate("Node_Start_01");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue"></div>
      </div>
    );
  }

  const currentStory = STORY_NODES[currentNode] || STORY_NODES["Node_Start_01"];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Story Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-fredoka text-electric-blue">{currentStory.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="bg-lime-green/20 text-lime-green border-lime-green/50">
              <i className="fas fa-map-marker-alt mr-1"></i>
              {currentStory.location}
            </Badge>
            <Badge variant="outline" className="bg-vibrant-purple/20 text-vibrant-purple border-vibrant-purple/50">
              Progress: {currentNode}
            </Badge>
          </div>
        </div>
        <Button
          onClick={resetStory}
          variant="outline"
          size="sm"
          className="text-gray-600 hover:text-gray-800"
        >
          <i className="fas fa-redo mr-2"></i>
          Restart Story
        </Button>
      </div>

      {/* Story Content */}
      <Card className="bg-gradient-to-br from-electric-blue/5 to-vibrant-purple/5 border-2 border-electric-blue/20">
        <CardHeader>
          <CardTitle className="text-xl text-gray-800">{currentStory.description}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed mb-6">
            {currentStory.content}
          </p>
          
          <Separator className="my-6" />
          
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <i className="fas fa-compass text-electric-blue"></i>
              What do you do next?
            </h3>
            
            <div className="grid gap-3">
              {currentStory.choices.map((choice, index) => (
                <Button
                  key={index}
                  onClick={() => handleChoice(choice.nextNode)}
                  disabled={updateProgressMutation.isPending}
                  variant="outline"
                  className="justify-start text-left h-auto p-4 hover:bg-electric-blue/10 hover:border-electric-blue/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-electric-blue/20 flex items-center justify-center text-electric-blue font-bold">
                      {index + 1}
                    </div>
                    <span>{choice.text}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Information */}
      <Card className="bg-gold-yellow/10 border-gold-yellow/30">
        <CardHeader>
          <CardTitle className="text-lg text-gold-yellow flex items-center gap-2">
            <i className="fas fa-info-circle"></i>
            Story State Manager Demo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-gray-600">
            This story system automatically saves your progress to the database. When you make choices, 
            your current story node (like "{currentNode}") is saved to your user profile. If you log out 
            and log back in, you'll continue exactly where you left off in your adventure.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}