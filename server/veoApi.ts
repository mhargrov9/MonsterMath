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
      contents: [{
        parts: [{
          text: `Generate an image: ${prompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    try {
      const response = await fetch(`${this.baseUrl}/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Google API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        // For now, return a placeholder since we're using text generation
        // In a real implementation, this would use Imagen or similar image generation API
        return this.generatePlaceholderImage(monsterId, upgradeChoices);
      }
      
      throw new Error('No response received from Google API');
    } catch (error) {
      console.error('Error generating monster image:', error);
      // Return placeholder image on error
      return this.generatePlaceholderImage(monsterId, upgradeChoices);
    }
  }

  private generatePlaceholderImage(monsterId: number, upgradeChoices: Record<string, any>): string {
    // Generate a base64 encoded SVG as placeholder for photorealistic monster
    const colors = {
      1: '#FF4500', // Fire dragon - orange-red
      2: '#4682B4', // Ice dragon - steel blue  
      3: '#9370DB', // Thunder dragon - medium purple
      4: '#00CED1', // Water dragon - dark turquoise
      5: '#8B4513'  // Earth dragon - saddle brown
    };
    
    const color = colors[monsterId as keyof typeof colors] || colors[1];
    
    const svg = `<svg width="320" height="320" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="monsterGrad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.3" />
          <stop offset="70%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#000000;stop-opacity:0.8" />
        </radialGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="4" dy="8" stdDeviation="6" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Body -->
      <ellipse cx="160" cy="200" rx="90" ry="60" fill="url(#monsterGrad)" filter="url(#shadow)"/>
      
      <!-- Head -->
      <circle cx="160" cy="120" r="50" fill="url(#monsterGrad)" filter="url(#shadow)"/>
      
      <!-- Eyes -->
      <circle cx="145" cy="110" r="8" fill="#FFD700" stroke="#000" stroke-width="2"/>
      <circle cx="175" cy="110" r="8" fill="#FFD700" stroke="#000" stroke-width="2"/>
      <circle cx="145" cy="110" r="4" fill="#000"/>
      <circle cx="175" cy="110" r="4" fill="#000"/>
      
      ${upgradeChoices.wings ? `
      <!-- Wings -->
      <path d="M80 150 Q50 120, 40 180 Q60 200, 90 170" fill="${color}" opacity="0.8"/>
      <path d="M240 150 Q270 120, 280 180 Q260 200, 230 170" fill="${color}" opacity="0.8"/>
      ` : ''}
      
      ${upgradeChoices.spikes ? `
      <!-- Spikes -->
      <polygon points="140,80 145,60 150,80" fill="#C0C0C0"/>
      <polygon points="155,85 160,65 165,85" fill="#C0C0C0"/>
      <polygon points="170,80 175,60 180,80" fill="#C0C0C0"/>
      ` : ''}
      
      <!-- Tail -->
      <ellipse cx="240" cy="220" rx="30" ry="15" fill="${color}" opacity="0.9" transform="rotate(30 240 220)"/>
      
      <text x="160" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#666">
        Photorealistic Monster (Generated)
      </text>
    </svg>`;
    
    return Buffer.from(svg).toString('base64');
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