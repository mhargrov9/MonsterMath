import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import InterestTest from "./InterestTest";

// Node navigation mapping - tracks which nodes lead to which previous nodes
const NODE_PARENTS: Record<string, string> = {
  "Node_02_Discovery": "Node_01_Awakening",
  "Node_03_Conversation": "Node_02_Discovery", 
  "Node_04_Crossroads": "Node_03_Conversation",
  "Node_5A_Village_Arrival": "Node_04_Crossroads",
  "Node_6A_Elder_Meeting": "Node_5A_Village_Arrival",
  "Node_7A_Den_Entrance": "Node_6A_Elder_Meeting",
  "Node_8A_Inner_Chamber": "Node_7A_Den_Entrance",
  "Node_5B_Yard_Arrival": "Node_04_Crossroads",
  "Node_6B_Confrontation": "Node_5B_Yard_Arrival",
  "Node_7B_Battle_Outcome": "Node_6B_Confrontation",
  "Node_9A_Reward": "Node_8A_Inner_Chamber",
  "Node_08_Great_Choice": "Node_7B_Battle_Outcome", // Only Path B leads here now
  "Node_09_Cliffhanger": "Node_08_Great_Choice"
};

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
    image: "@assets/The Whispering Glade_1750207549359.png"
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
    image: "@assets/The Whispering Glade_1750207549359.png"
  },
  "Node_03_Conversation": {
    title: "The Whispering Glade",
    description: "The First Conversation",
    content: "", // Will be set dynamically based on previous choice
    choices: [
      { text: "Continue listening to the Shard", nextNode: "Node_04_Crossroads" }
    ],
    location: "The Whispering Glade",
    image: "@assets/The Whispering Glade_1750207549359.png"
  },
  "Node_04_Crossroads": {
    title: "Forest Crossroads",
    description: "A fork in the road - choose your path",
    content: "The Shard says: 'I sense safety and other free monsters towards the village... but I also feel a strange, forgotten power emanating from those old ruins. The choice is yours. Where should we go?'",
    choices: [
      { text: "Head towards Elderwood Village", nextNode: "Node_5A_Village_Arrival" },
      { text: "Investigate the Old Training Yard", nextNode: "Node_5B_Yard_Arrival" }
    ],
    location: "Forest Crossroads",
    image: "@assets/Forest Crossroads_1750207549400.png"
  },
  
  // PATH A - Village Route
  "Node_5A_Village_Arrival": {
    title: "Elderwood Village - Entrance",
    description: "Arrival at the Village",
    content: "You arrive at the village gates. It feels safe from the strange energy in the forest, but it's also tense. No one is out in the open. You see a nervous monster peeking out from behind a market stall.",
    choices: [
      { text: "Approach the nervous monster", nextNode: "Node_6A_Elder_Meeting" },
      { text: "Look for the elder's home", nextNode: "Node_6A_Elder_Meeting" }
    ],
    location: "Elderwood Village",
    image: "@assets/Elderwood Village_1750207549399.png"
  },
  "Node_6A_Elder_Meeting": {
    title: "Elder's Abode",
    description: "Meeting with Elder Korin",
    content: "", // Will be set dynamically based on previous choice
    choices: [
      { text: "I will accept this quest", nextNode: "Node_7A_Den_Entrance" }
    ],
    location: "Elder's Abode",
    image: "@assets/Elder's Abode_1750207549398.png"
  },
  "Node_7A_Den_Entrance": {
    title: "Gloomfang Den - Entrance",
    description: "The Gloomfang Den",
    content: "The Elder guides you to the den and wishes you luck before retreating to safety. The Shard of Remembrance hums in your mind, 'There are several of Vorvax's creatures in there. They feel... like freshly broken stone and shadows. Be ready for a fight. How do we approach?'",
    choices: [
      { text: "Enter the den cautiously, ready to ambush", nextNode: "Node_8A_Inner_Chamber" },
      { text: "Charge in aggressively, letting out a battle cry", nextNode: "Node_8A_Inner_Chamber" }
    ],
    location: "Gloomfang Den - Entrance",
    image: "@assets/Gloomfang Den - Entrance_1750207549397.png"
  },
  "Node_8A_Inner_Chamber": {
    title: "Gloomfang Den - Inner Chamber",
    description: "The Inner Chamber",
    content: "After defeating the scouts, you push deeper into the cavern. A tougher-looking 'Scout Commander' stands guard over a crude wooden chest. It snarls, recognizing the light of the Shard as a threat. 'For the glory of Vorvax!' it screeches as it lunges!",
    choices: [
      { text: "Fight the Scout Commander", nextNode: "Node_9A_Reward" }
    ],
    location: "Gloomfang Den - Inner Chamber",
    image: "@assets/Gloomfang Den - Inner Chamber_1750207549396.png"
  },
  "Node_9A_Reward": {
    title: "The Elder's Reward",
    description: "The Elder's Reward",
    content: "You return to the grateful Elder. 'You have the strength of the old heroes,' he says, his voice filled with newfound respect. 'As promised, a reward for your courage. Choose one of these young monsters who, inspired by your deeds, has pledged to join your cause. More importantly, I found this on the commander. It is a map... it points to a major gathering point for Vorvax's forces... The Sunken Temple. This must be your next destination.'",
    choices: [
      { text: "Accept the reward and continue", nextNode: "Node_08_Great_Choice" }
    ],
    location: "Elder's Abode",
    image: "@assets/Elder's Abode_1750207549398.png"
  },

  // PATH B - Training Yard Route  
  "Node_5B_Yard_Arrival": {
    title: "The Ruined Training Yard",
    description: "Ruins of an ancient training ground",
    content: "You arrive at the crumbling remains of what was once a grand training facility. Broken statues of legendary monsters stand sentinel over overgrown combat rings. The Shard grows brighter. 'This place... I remember training here, long ago. But something stirs in the shadows...'",
    choices: [
      { text: "Explore the training rings", nextNode: "Node_6B_Confrontation" },
      { text: "Examine the broken statues", nextNode: "Node_6B_Confrontation" }
    ],
    location: "The Ruined Training Yard",
    image: "@assets/The Ruined Training Yard_1750207549394.png"
  },
  "Node_6B_Confrontation": {
    title: "The Ruined Training Yard",
    description: "An encounter with dark forces",
    content: "As you explore, shadow creatures materialize from the ruins! Their leader, a corrupted monster with glowing red eyes, speaks: 'The Shard belongs to Master Vorvax! Surrender it now!' The Shard pulses with defiant energy. 'These servants cannot be reasoned with. We must fight or flee!'",
    choices: [
      { text: "Stand and fight the shadows", nextNode: "Node_7B_Battle_Outcome" },
      { text: "Try to escape through the ruins", nextNode: "Node_7B_Battle_Outcome" }
    ],
    location: "The Ruined Training Yard",
    image: "@assets/The Ruined Training Yard_1750207549394.png"
  },
  "Node_7B_Battle_Outcome": {
    title: "The Ruined Training Yard",
    description: "The truth about your destiny unfolds",
    content: "Whether through courage or cunning, you overcome the shadow creatures. As they dissolve, the Shard glows triumphantly. 'Well done! But this was only a small taste of Vorvax's power. The real battle lies ahead. I now sense three ancient locations calling to us - each holds a piece of the puzzle we need to stop the darkness.'",
    choices: [
      { text: "Learn about these ancient locations", nextNode: "Node_08_Great_Choice" }
    ],
    location: "The Ruined Training Yard",
    image: "@assets/The Ruined Training Yard_1750207549394.png"
  },

  // CONVERGENCE POINT
  "Node_08_Great_Choice": {
    title: "World Map",
    description: "Three paths to destiny revealed",
    content: "The Shard says: \"Wait... now that I know what to look for, I can sense more of Vorvax's power. There are two other locations just as powerful as the Sunken Temple... a Sky Spire that crackles with lightning, and a Volcanic Forge that burns with ancient rage. All three are connected. We must conquer them all to face Vorvax, but we can only choose one path now.\"",
    choices: [
      { text: "Travel to the Sunken Temple", nextNode: "Node_09_Cliffhanger" },
      { text: "Ascend the Sky Spire", nextNode: "Node_09_Cliffhanger" },
      { text: "Approach the Volcanic Forge", nextNode: "Node_09_Cliffhanger" }
    ],
    location: "The World Map",
    image: "@assets/The World Map_1750207549385.png"
  },
  "Node_09_Cliffhanger": {
    title: "End of Chapter 1",
    description: "The journey continues...",
    content: "You have completed the first chapter of your adventure! The journey to save the Monster World begins now. Subscribe to continue.",
    choices: [],
    location: "Chapter Complete",
    image: "@assets/The World Map_1750207549385.png"
  }
};

export default function StoryManager() {
  const [currentNode, setCurrentNode] = useState<string>("Node_01_Awakening");
  const [previousChoice, setPreviousChoice] = useState<string | null>(null);
  const [showInterestTest, setShowInterestTest] = useState<boolean>(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle convergence point - both paths can lead to Node_08_Great_Choice
  useEffect(() => {
    if (currentNode === "Node_7B_Battle_Outcome") {
      NODE_PARENTS["Node_08_Great_Choice"] = "Node_7B_Battle_Outcome";
    } else if (currentNode === "Node_9A_Reward") {
      NODE_PARENTS["Node_08_Great_Choice"] = "Node_9A_Reward";
    }
  }, [currentNode]);

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

  const handleChoice = (nextNode: string, choiceText?: string) => {
    if (choiceText) {
      setPreviousChoice(choiceText);
    }
    
    // Check if this choice leads to the cliffhanger (interest test)
    if (nextNode === "Node_09_Cliffhanger") {
      setShowInterestTest(true);
      return;
    }
    
    setCurrentNode(nextNode);
    updateProgressMutation.mutate(nextNode);
  };

  const resetStory = () => {
    setShowInterestTest(false);
    updateProgressMutation.mutate("Node_01_Awakening");
  };

  const handleInterestTestComplete = () => {
    setShowInterestTest(false);
    updateProgressMutation.mutate("Node_01_Awakening");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue"></div>
      </div>
    );
  }

  // Show Interest Test if triggered
  if (showInterestTest) {
    return <InterestTest onComplete={handleInterestTestComplete} />;
  }

  // Get dynamic content for nodes based on previous choice
  const getDynamicContent = (node: string) => {
    if (node === "Node_03_Conversation") {
      let introText = "";
      
      if (previousChoice === "Gently touch the Shard") {
        introText = "A voice, ancient and melodic, flashes into your mind as your hand makes contact. It is startled, but warm.\n\nThe Shard: \"A touch! So bright! I haven't felt... anything... in so long. You can hear me? Your mind... it's not like the others. You are afraid, but there is courage there. Thank the cosmos.\"";
      } else {
        introText = "A timid voice cautiously answers your mental call, like an echo from far away.\n\nThe Shard: \"Hello? A voice in the silence... Is someone there? I can feel your thoughts... you are not one of them. You are afraid, but brave. Thank the cosmos, I am not alone.\"";
      }
      
      const sharedDialogue = "The Shard: \"I do not know how I came to this place, or what I truly am. I am... a fragment. All I have are echoes of a terrible end, and a name that brings with it an unspeakable dread... Vorvax.\"\n\nYou feel a pulse of energy from the Shard, a sense of grim determination.\n\nThe Shard: \"That shadow has found this world. We cannot stay here. Its minions will be searching for me... and for any monster like you who can resist its call. I will lend you what little strength I have. We must find safety. We must find answers.\"";
      
      return `${introText}\n\n${sharedDialogue}`;
    }
    
    if (node === "Node_6A_Elder_Meeting") {
      let introText = "";
      
      if (previousChoice === "Approach the nervous monster") {
        introText = "You approach cautiously. The small, furry monster, named Pip, flinches at first, but then sees the gentle light of the Shard in your mind's eye. He stammers, \"The Elder... you must see the Elder! He's the only one who knows what to do!\" He quickly leads you through the quiet village to a large home built into a tree. Pip gives you a nod of encouragement before scurrying away. You knock, and the door swings open to reveal an ancient turtle monster. He looks at you, then at the Shard's faint light. \"Pip said you could be trusted,\" the Elder says, his voice like grinding stones. \"A rare quality. Come in, young one. We have much to discuss.\"";
      } else {
        introText = "You follow a sign carved with ancient symbols to the largest tree and knock on the sturdy wooden door. It opens to reveal an ancient turtle monster, Elder Korin, who squints at you with wary eyes. \"I was not expecting visitors. These are dark times,\" he says, his voice deep and slow. \"State your purpose.\" After you explain your quest with the help of the Shard, the Elder considers you for a long moment. \"A noble goal, but words are wind. The darkness you speak of has already sent its scouts to test our defenses.\"";
      }
      
      const sharedDialogue = "Elder Korin points a gnarled claw towards the edge of the village map on his table. \"Vorvax's minions—foul creatures of twisted rock and shadow—have made a den in the old Gloomfang caves. They terrorize my people and poison the forest. Go there. Prove your power and your heart by clearing out the den. Do this for us, and I will give you a reward worthy of a hero and any information I have.\"";
      
      return `${introText}\n\n${sharedDialogue}`;
    }
    
    return STORY_NODES[node]?.content || "";
  };

  const baseStory = STORY_NODES[currentNode] || STORY_NODES["Node_01_Awakening"];
  const currentStory = {
    ...baseStory,
    content: getDynamicContent(currentNode)
  };

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
                    <div className="w-full h-48 sm:h-64 bg-gradient-to-br from-amber-200/50 to-yellow-300/50 dark:from-amber-800/50 dark:to-yellow-700/50 rounded-xl border-2 border-amber-400/50 dark:border-amber-500/50 relative overflow-hidden">
                      {/* Mystical Shimmer Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-pulse"></div>
                      {currentStory.image.startsWith('@assets/') ? (
                        <img 
                          src={currentStory.image.replace('@assets/', '/attached_assets/')}
                          alt={currentStory.description}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center p-4 relative z-10">
                            <div className="text-4xl mb-3">🌟</div>
                            <div className="text-sm text-amber-800 dark:text-amber-200 italic font-serif leading-relaxed">
                              {currentStory.image}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Story Text with Enchanted Styling */}
            <div className="relative mb-8">
              <div className="relative z-10 px-6 py-6">
                <p className="text-amber-900 dark:text-amber-100 leading-relaxed text-lg font-serif tracking-wide text-center italic whitespace-pre-wrap">
                  "{currentStory.content}"
                </p>
              </div>
              {/* Subtle Text Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/10 to-transparent rounded-lg"></div>
            </div>
            
            {/* Mystical Divider */}
            <div className="flex justify-center items-center gap-4 my-8">
              <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent"></div>
              <div className="text-2xl text-amber-700 dark:text-amber-300">⚡</div>
              <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent"></div>
            </div>
            
            {/* Return to Previous Node Button */}
            {NODE_PARENTS[currentNode] && (
              <div className="mb-6">
                <button
                  onClick={() => handleChoice(NODE_PARENTS[currentNode])}
                  disabled={updateProgressMutation.isPending}
                  className="group relative px-6 py-3 bg-gradient-to-r from-slate-200 via-gray-200 to-slate-200 dark:from-slate-700 dark:via-gray-700 dark:to-slate-700 border-2 border-slate-400/60 dark:border-slate-500/60 rounded-xl hover:from-slate-300 hover:via-gray-300 hover:to-slate-300 dark:hover:from-slate-600 dark:hover:via-gray-600 dark:hover:to-slate-600 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">↶</span>
                    <span className="font-serif text-slate-800 dark:text-slate-200 font-medium">
                      Return to {STORY_NODES[NODE_PARENTS[currentNode]]?.title || NODE_PARENTS[currentNode]}
                    </span>
                  </div>
                </button>
              </div>
            )}

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
            ) : currentStory.choices && currentStory.choices.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-center text-xl font-serif font-bold text-amber-800 dark:text-amber-200 flex items-center justify-center gap-3">
                  <span className="text-2xl">🧭</span>
                  Choose Your Path, Brave Adventurer
                  <span className="text-2xl">🧭</span>
                </h3>
                
                <div className="grid gap-4 mt-6">
                  {currentStory.choices?.map((choice, index) => (
                    <button
                      key={index}
                      onClick={() => handleChoice(choice.nextNode, choice.text)}
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