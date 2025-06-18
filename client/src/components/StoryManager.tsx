import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

// Chapter 1: The Complete Choose Your Own Adventure Story
const STORY_NODES: Record<string, {
  title: string;
  description: string;
  content: string;
  choices: Array<{ text: string; nextNode: string; }>;
  location: string;
  image?: string;
}> = {
  "Node_01_Awakening": {
    title: "The Whispering Glade",
    description: "The echo of a terrifying vision fades",
    content: "The echo of the terrifying vision fades. You find yourself in a familiar glade, but the air is heavy with a silent dread... A strange, psychic hum buzzes at the edge of your thoughts. You are alone.",
    choices: [
      { text: "Look for the other monsters", nextNode: "Node_02_Discovery" },
      { text: "Investigate the source of the hum", nextNode: "Node_02_Discovery" }
    ],
    location: "The Whispering Glade",
    image: "A serene forest glade with an unnaturally dark and quiet atmosphere"
  },
  "Node_02_Discovery": {
    title: "The Whispering Glade",
    description: "A mysterious crystalline shard pulses with warm light",
    content: "You are drawn to an ancient tree... Half-buried in its roots is a crystalline shard, glowing with a soft, warm light. It pulses in rhythm with the hum in your mind, and you feel a sense of profound sadness and loneliness coming from it...",
    choices: [
      { text: "Gently touch the Shard", nextNode: "Node_03_Conversation" },
      { text: "Call out to it with your thoughts", nextNode: "Node_03_Conversation" }
    ],
    location: "The Whispering Glade",
    image: "The same glade, but with a soft, pulsating light visible at the base of an ancient tree"
  },
  "Node_03_Conversation": {
    title: "The Whispering Glade",
    description: "First contact with the mysterious Shard",
    content: "As you reach out, the Shard's glow intensifies. A voice whispers in your mind: 'At last... another free soul. I have been waiting so long...' The voice trembles with relief and ancient wisdom. 'I am but a fragment of what once was, but I remember. The darkness spreads, and the name... Vorvax... brings terror even to my fractured memories. You must be careful, young one. Great dangers lie ahead.'",
    choices: [
      { text: "Continue listening to the Shard", nextNode: "Node_04_Crossroads" }
    ],
    location: "The Whispering Glade",
    image: "The Shard glowing more brightly, casting ethereal light through the glade"
  },
  "Node_04_Crossroads": {
    title: "Forest Crossroads",
    description: "A fork in the road - choose your path",
    content: "The Shard says: 'I sense safety and other free monsters towards the village... but I also feel a strange, forgotten power emanating from those old ruins. The choice is yours. Where should we go?'",
    choices: [
      { text: "Head towards the Monster Village", nextNode: "Node_5A_Village_Arrival" },
      { text: "Investigate the Old Training Yard", nextNode: "Node_5B_Yard_Arrival" }
    ],
    location: "Forest Crossroads",
    image: "An ancient, mossy path splitting in two - one path leads towards a village, the other towards ruins"
  },
  
  // PATH A - Village Route
  "Node_5A_Village_Arrival": {
    title: "Monster Village",
    description: "A haven for free monsters",
    content: "You emerge from the forest to find a bustling village of free monsters. Creatures of all types go about their daily lives - some tending gardens, others crafting tools. The atmosphere is peaceful, but you notice guards posted at the village entrance, their eyes scanning the forest nervously.",
    choices: [
      { text: "Approach the village guards", nextNode: "Node_6A_Elder_Meeting" },
      { text: "Quietly observe the village first", nextNode: "Node_6A_Elder_Meeting" }
    ],
    location: "Monster Village",
    image: "A vibrant village with monsters of various types living in harmony"
  },
  "Node_6A_Elder_Meeting": {
    title: "Village Elder's Hut",
    description: "Wisdom and warnings from the village elder",
    content: "The village Elder, an ancient Tortoise with crystalline growths on his shell, listens intently as you share your story. 'The Shard speaks truth,' he says gravely. 'Vorvax's influence grows stronger. We've prepared a sanctuary - the Hidden Den - but it requires a guardian. Will you help us protect the other refugees?'",
    choices: [
      { text: "Agree to guard the Hidden Den", nextNode: "Node_7A_Den_Entrance" },
      { text: "Ask about Vorvax first", nextNode: "Node_7A_Den_Entrance" }
    ],
    location: "Village Elder's Hut",
    image: "A wise, ancient Tortoise Elder with crystal formations on his shell"
  },
  "Node_7A_Den_Entrance": {
    title: "The Hidden Den",
    description: "A secret sanctuary beneath the village",
    content: "The Elder leads you to a concealed entrance beneath the village. 'This den has protected our kind for generations,' he explains. Inside, you see dozens of monsters - some injured, others simply scared. The Shard pulses warmly. 'This place... it feels safe. But I sense something approaching...'",
    choices: [
      { text: "Prepare the den's defenses", nextNode: "Node_8A_Village_Defense" },
      { text: "Scout for approaching threats", nextNode: "Node_8A_Village_Defense" }
    ],
    location: "The Hidden Den",
    image: "An underground sanctuary filled with various monsters seeking refuge"
  },
  "Node_8A_Village_Defense": {
    title: "Under Siege",
    description: "The village comes under attack",
    content: "Shadow creatures emerge from the forest, their eyes glowing with malevolent energy. The villagers fight bravely, but they're outnumbered. The Shard's voice is urgent: 'These are Vorvax's servants! We must protect the innocent, but I also sense something else... three ancient locations have awakened. After this battle, we must choose our next destination carefully.'",
    choices: [
      { text: "Fight to defend the village", nextNode: "Node_08_Great_Choice" }
    ],
    location: "Monster Village",
    image: "The village under attack by shadowy creatures with glowing eyes"
  },

  // PATH B - Training Yard Route  
  "Node_5B_Yard_Arrival": {
    title: "Old Training Yard",
    description: "Ruins of an ancient training ground",
    content: "You arrive at the crumbling remains of what was once a grand training facility. Broken statues of legendary monsters stand sentinel over overgrown combat rings. The Shard grows brighter. 'This place... I remember training here, long ago. But something stirs in the shadows...'",
    choices: [
      { text: "Explore the training rings", nextNode: "Node_6B_Confrontation" },
      { text: "Examine the broken statues", nextNode: "Node_6B_Confrontation" }
    ],
    location: "Old Training Yard",
    image: "Ancient ruins of a training ground with broken monster statues and overgrown combat rings"
  },
  "Node_6B_Confrontation": {
    title: "Shadow Confrontation",
    description: "An encounter with dark forces",
    content: "As you explore, shadow creatures materialize from the ruins! Their leader, a corrupted monster with glowing red eyes, speaks: 'The Shard belongs to Master Vorvax! Surrender it now!' The Shard pulses with defiant energy. 'These servants cannot be reasoned with. We must fight or flee!'",
    choices: [
      { text: "Stand and fight the shadows", nextNode: "Node_7B_Battle_Outcome" },
      { text: "Try to escape through the ruins", nextNode: "Node_7B_Battle_Outcome" }
    ],
    location: "Old Training Yard",
    image: "Shadow creatures with glowing red eyes emerging from ancient ruins"
  },
  "Node_7B_Battle_Outcome": {
    title: "Victory and Revelation",
    description: "The truth about your destiny unfolds",
    content: "Whether through courage or cunning, you overcome the shadow creatures. As they dissolve, the Shard glows triumphantly. 'Well done! But this was only a small taste of Vorvax's power. The real battle lies ahead. I now sense three ancient locations calling to us - each holds a piece of the puzzle we need to stop the darkness.'",
    choices: [
      { text: "Learn about these ancient locations", nextNode: "Node_08_Great_Choice" }
    ],
    location: "Old Training Yard",
    image: "The training yard peaceful again, with the Shard glowing brightly in victory"
  },

  // CONVERGENCE POINT
  "Node_08_Great_Choice": {
    title: "World Map",
    description: "Three paths to destiny revealed",
    content: "The Shard projects a mystical map in your mind, showing three ominous locations: 'The Sunken Temple holds the power of ancient knowledge, but its depths are treacherous. The Sky Spire reaches toward forgotten secrets, but the journey is perilous. The Volcanic Forge burns with primal energy, but its fires test the soul. Choose wisely - each path will change you forever.'",
    choices: [
      { text: "Travel to the Sunken Temple", nextNode: "Node_09_Cliffhanger" },
      { text: "Ascend the Sky Spire", nextNode: "Node_09_Cliffhanger" },
      { text: "Approach the Volcanic Forge", nextNode: "Node_09_Cliffhanger" }
    ],
    location: "World Map",
    image: "A mystical map showing three ominous locations: a sunken temple, a sky spire, and a volcanic forge"
  },
  "Node_09_Cliffhanger": {
    title: "End of Chapter 1",
    description: "The journey continues...",
    content: "You have completed the first chapter of your adventure! The journey to save the Monster World begins now. Subscribe to continue.",
    choices: [],
    location: "Chapter Complete",
    image: "A dramatic vista showing your chosen destination in the distance"
  }
};

export default function StoryManager() {
  const [currentNode, setCurrentNode] = useState<string>("Node_01_Awakening");
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
    setCurrentNode("Node_01_Awakening");
    updateProgressMutation.mutate("Node_01_Awakening");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue"></div>
      </div>
    );
  }

  const currentStory = STORY_NODES[currentNode] || STORY_NODES["Node_01_Awakening"];

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
          {/* Location Image */}
          {currentStory.image && (
            <div className="mb-6">
              <div className="w-full h-48 sm:h-64 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-400">
                <div className="text-center p-4">
                  <div className="text-2xl mb-2">🖼️</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 italic">
                    {currentStory.image}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <p className="text-gray-900 dark:text-gray-100 leading-relaxed mb-6 text-base font-medium">
            {currentStory.content}
          </p>
          
          <Separator className="my-6" />
          
          {/* Chapter Complete Handling */}
          {currentNode === "Node_09_Cliffhanger" ? (
            <div className="space-y-4">
              <div className="text-center p-6 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-purple-300">
                <div className="text-4xl mb-4">🎭</div>
                <h3 className="text-xl font-bold text-purple-700 dark:text-purple-300 mb-2">
                  Chapter 1 Complete!
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Your adventure has just begun. The mysteries of Vorvax and the ancient locations await...
                </p>
                <Button
                  onClick={resetStory}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  Play Chapter 1 Again
                </Button>
              </div>
            </div>
          ) : currentStory.choices.length > 0 ? (
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
          ) : (
            <div className="text-center p-4 text-gray-600">
              <p>The story continues...</p>
            </div>
          )}
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