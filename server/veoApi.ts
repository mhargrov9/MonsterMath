import fetch from 'node-fetch';

interface VeoImageRequest {
  prompt: string;
  aspectRatio?: string;
  negativePrompt?: string;
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

interface VeoVideoRequest {
  prompt: string;
  aspectRatio?: string;
  duration?: string;
  negativePrompt?: string;
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

export class VeoApiClient {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY!;
    if (!this.apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }
  }

  async generateMonsterImage(monsterId: number, upgradeChoices: Record<string, any>): Promise<string> {
    const prompt = this.buildMonsterImagePrompt(monsterId, upgradeChoices);
    
    const requestBody = {
      prompt: prompt,
      aspectRatio: "1:1",
      negativePrompt: "cartoon, anime, 2D, flat, low quality, blurry, pixelated, simple",
      safetySettings: [
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    try {
      const response = await fetch(`${this.baseUrl}/models/imagen-3.0-generate-001:generateImage?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Veo API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      if (data.candidates && data.candidates[0]?.image?.data) {
        return data.candidates[0].image.data; // Base64 encoded image
      }
      
      throw new Error('No image data received from Veo API');
    } catch (error) {
      console.error('Error generating monster image:', error);
      throw error;
    }
  }

  async generateBattleVideo(playerMonsterId: number, aiMonsterId: number, playerUpgrades: Record<string, any>, aiUpgrades: Record<string, any>): Promise<string> {
    const prompt = this.buildBattleVideoPrompt(playerMonsterId, aiMonsterId, playerUpgrades, aiUpgrades);
    
    const requestBody = {
      prompt: prompt,
      aspectRatio: "16:9",
      duration: "5s",
      negativePrompt: "cartoon, anime, 2D, flat, low quality, blurry, pixelated, simple, static",
      safetySettings: [
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    try {
      const response = await fetch(`${this.baseUrl}/models/veo-001:generateVideo?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Veo API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      if (data.candidates && data.candidates[0]?.video?.data) {
        return data.candidates[0].video.data; // Base64 encoded video
      }
      
      throw new Error('No video data received from Veo API');
    } catch (error) {
      console.error('Error generating battle video:', error);
      throw error;
    }
  }

  private buildMonsterImagePrompt(monsterId: number, upgradeChoices: Record<string, any>): string {
    const basePrompts = {
      1: "Photorealistic fire dragon with scales that shimmer like molten lava",
      2: "Photorealistic ice dragon with crystalline scales and frost emanating from its body", 
      3: "Photorealistic thunder dragon with electric energy crackling across its dark scales",
      4: "Photorealistic water dragon with translucent blue scales and water droplets",
      5: "Photorealistic earth dragon with rocky, stone-like scales and moss growing on its back"
    };

    let prompt = basePrompts[monsterId as keyof typeof basePrompts] || basePrompts[1];
    
    // Add upgrade details
    if (upgradeChoices.teeth === 'razor') {
      prompt += ", with razor-sharp gleaming fangs";
    }
    
    if (upgradeChoices.spikes === 'metallic' || upgradeChoices.spikes === 'ice') {
      prompt += ", with metallic spikes protruding from its back and shoulders";
    }
    
    if (upgradeChoices.muscles === 'enhanced') {
      prompt += ", with enhanced muscular definition and powerful limbs";
    }
    
    if (upgradeChoices.wings === 'flame' || upgradeChoices.wings === 'ice') {
      prompt += ", with large majestic wings spread wide";
    }
    
    if (upgradeChoices.tail === 'spiked') {
      prompt += ", with a spiked tail ready to strike";
    }

    prompt += ". Professional wildlife photography, 8K resolution, dramatic lighting, studio quality, highly detailed, hyperrealistic, masterpiece quality.";
    
    return prompt;
  }

  private buildBattleVideoPrompt(playerMonsterId: number, aiMonsterId: number, playerUpgrades: Record<string, any>, aiUpgrades: Record<string, any>): string {
    const monsterTypes = {
      1: "fire dragon",
      2: "ice dragon", 
      3: "thunder dragon",
      4: "water dragon",
      5: "earth dragon"
    };

    const playerType = monsterTypes[playerMonsterId as keyof typeof monsterTypes] || "fire dragon";
    const aiType = monsterTypes[aiMonsterId as keyof typeof monsterTypes] || "ice dragon";

    let prompt = `Cinematic battle scene between a photorealistic ${playerType} and a photorealistic ${aiType}. `;
    prompt += "The monsters are engaged in fierce combat, with one lunging forward to attack while the other recoils from impact. ";
    prompt += "Dramatic lighting with sparks, fire, ice, or energy effects. ";
    prompt += "Professional cinematography, 8K video quality, slow motion battle sequences, ";
    prompt += "hyperrealistic creature movement, dynamic camera angles, epic fantasy battle.";
    
    return prompt;
  }
}

export const veoClient = new VeoApiClient();