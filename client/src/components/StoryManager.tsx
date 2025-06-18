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

      {/* Magical Story Scroll */}
      <div className="relative">
        {/* Enchanted Border with Mystical Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-200/30 via-yellow-100/20 to-amber-300/30 dark:from-amber-900/40 dark:via-yellow-900/30 dark:to-amber-800/40 rounded-3xl blur-sm transform rotate-1"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-200/20 via-blue-100/15 to-purple-300/25 dark:from-purple-900/30 dark:via-blue-900/20 dark:to-purple-800/35 rounded-3xl blur-sm transform -rotate-1"></div>
        
        {/* Main Scroll Container */}
        <div className="relative bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 dark:from-amber-950 dark:via-yellow-950 dark:to-amber-900 border-4 border-amber-600/60 dark:border-amber-400/60 rounded-3xl shadow-2xl">
          {/* Decorative Corner Flourishes */}
          <div className="absolute top-2 left-2 text-2xl text-amber-600/70 dark:text-amber-400/70">✦</div>
          <div className="absolute top-2 right-2 text-2xl text-amber-600/70 dark:text-amber-400/70">✦</div>
          <div className="absolute bottom-2 left-2 text-2xl text-amber-600/70 dark:text-amber-400/70">✦</div>
          <div className="absolute bottom-2 right-2 text-2xl text-amber-600/70 dark:text-amber-400/70">✦</div>
          
          {/* Scroll Header with Mystical Design */}
          <div className="border-b-4 border-amber-600/60 dark:border-amber-400/60 bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-100 dark:from-amber-800 dark:via-yellow-800 dark:to-amber-800 p-6 rounded-t-3xl">
            <div className="text-center">
              <div className="text-3xl mb-2">✨</div>
              <h2 className="text-2xl font-serif font-bold text-amber-900 dark:text-amber-100 tracking-wide">{currentStory.description}</h2>
              <div className="flex justify-center items-center gap-2 mt-3">
                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent"></div>
                <div className="text-amber-700 dark:text-amber-300">⚜</div>
                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent"></div>
              </div>
            </div>
          </div>
          
          {/* Scroll Content */}
          <div className="p-8">
            {/* Mystical Location Frame */}
            {currentStory.image && (
              <div className="mb-8">
                <div className="relative">
                  {/* Ornate Frame */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-yellow-600/20 dark:from-amber-600/30 dark:to-yellow-400/30 rounded-2xl transform rotate-1"></div>
                  <div className="relative bg-gradient-to-br from-amber-100 to-yellow-200 dark:from-amber-900 dark:to-yellow-800 border-4 border-amber-500/70 dark:border-amber-400/70 rounded-2xl p-6 shadow-inner">
                    <div className="w-full h-48 sm:h-64 bg-gradient-to-br from-amber-200/50 to-yellow-300/50 dark:from-amber-800/50 dark:to-yellow-700/50 rounded-xl border-2 border-amber-400/50 dark:border-amber-500/50 flex items-center justify-center relative overflow-hidden">
                      {/* Mystical Shimmer Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-pulse"></div>
                      <div className="text-center p-4 relative z-10">
                        <div className="text-4xl mb-3">🌟</div>
                        <div className="text-sm text-amber-800 dark:text-amber-200 italic font-serif leading-relaxed">
                          {currentStory.image}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Story Text with Enchanted Styling */}
            <div className="relative mb-8">
              <p className="text-amber-900 dark:text-amber-100 leading-relaxed text-lg font-serif tracking-wide text-center italic relative z-10 px-4">
                "{currentStory.content}"
              </p>
              {/* Subtle Text Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/10 to-transparent rounded-lg"></div>
            </div>
            
            {/* Mystical Divider */}
            <div className="flex justify-center items-center gap-4 my-8">
              <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent"></div>
              <div className="text-2xl text-amber-700 dark:text-amber-300">⚡</div>
              <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent"></div>
            </div>
            
            {/* Chapter Complete Handling */}
            {currentNode === "Node_09_Cliffhanger" ? (
              <div className="space-y-6">
                <div className="text-center p-8 bg-gradient-to-br from-purple-200 via-blue-200 to-purple-300 dark:from-purple-900 dark:via-blue-900 dark:to-purple-800 border-4 border-purple-500/60 dark:border-purple-400/60 rounded-2xl shadow-inner relative">
                  <div className="absolute top-2 left-2 text-purple-600/70 dark:text-purple-400/70">★</div>
                  <div className="absolute top-2 right-2 text-purple-600/70 dark:text-purple-400/70">★</div>
                  <div className="text-5xl mb-4">🏆</div>
                  <h3 className="text-2xl font-serif font-bold text-purple-800 dark:text-purple-200 mb-3">
                    Chapter 1 Complete!
                  </h3>
                  <p className="text-purple-700 dark:text-purple-300 mb-6 font-serif italic">
                    Your adventure has just begun. The mysteries of Vorvax and the ancient locations await...
                  </p>
                  <button
                    onClick={resetStory}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 text-white font-serif font-bold rounded-xl border-2 border-purple-400 shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    ⟲ Begin Tale Anew
                  </button>
                </div>
              </div>
            ) : currentStory.choices.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-center text-xl font-serif font-bold text-amber-800 dark:text-amber-200 flex items-center justify-center gap-3">
                  <span className="text-2xl">🧭</span>
                  Choose Your Path, Brave Adventurer
                  <span className="text-2xl">🧭</span>
                </h3>
                
                <div className="grid gap-4 mt-6">
                  {currentStory.choices.map((choice, index) => (
                    <button
                      key={index}
                      onClick={() => handleChoice(choice.nextNode)}
                      disabled={updateProgressMutation.isPending}
                      className="group relative p-5 bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-100 dark:from-amber-800 dark:via-yellow-800 dark:to-amber-800 border-3 border-amber-500/60 dark:border-amber-400/60 rounded-xl hover:from-amber-200 hover:via-yellow-200 hover:to-amber-200 dark:hover:from-amber-700 dark:hover:via-yellow-700 dark:hover:to-amber-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-102"
                    >
                      <div className="absolute top-1 left-1 text-amber-600/50 dark:text-amber-400/50 text-xs">✦</div>
                      <div className="absolute top-1 right-1 text-amber-600/50 dark:text-amber-400/50 text-xs">✦</div>
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-yellow-600 dark:from-amber-500 dark:to-yellow-500 flex items-center justify-center text-white font-serif font-bold text-lg shadow-inner">
                          {index + 1}
                        </div>
                        <span className="font-serif text-amber-900 dark:text-amber-100 font-medium text-lg group-hover:text-amber-800 dark:group-hover:text-amber-200 transition-colors">
                          {choice.text}
                        </span>
                      </div>
                      {/* Subtle Hover Glow */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center p-6 text-amber-700 dark:text-amber-300 font-serif italic">
                <span className="text-2xl mr-2">📜</span>
                The tale unfolds...
                <span className="text-2xl ml-2">📜</span>
              </div>
            )}
          </div>
        </div>
      </div>

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