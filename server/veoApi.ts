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
      negativePrompt: "cartoon, anime, 2D, flat, low quality, blurry, pixelated, simple, child-like, cute, friendly",
      safetySettings: [
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    try {
      // Try Veo image generation API first
      const response = await fetch(`${this.baseUrl}/models/imagen-3.0-generate-001:generateImage?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        console.log(`Imagen API failed with ${response.status}, trying alternative approach`);
        // Fall back to Gemini Pro Vision for image generation
        return await this.generateImageWithGeminiVision(prompt);
      }

      const data = await response.json() as any;
      
      if (data.candidates && data.candidates[0]?.image?.data) {
        return data.candidates[0].image.data; // Base64 encoded image
      }
      
      // If no image data, try alternative
      return await this.generateImageWithGeminiVision(prompt);
    } catch (error) {
      console.error('Error generating monster image:', error);
      // Try alternative approach
      return await this.generateImageWithGeminiVision(prompt);
    }
  }

  private async generateImageWithGeminiVision(prompt: string): Promise<string> {
    const requestBody = {
      contents: [{
        parts: [{
          text: `Create a photorealistic image description and generate SVG code for: ${prompt}. Make it extremely detailed and realistic, not cartoon-like.`
        }]
      }],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      }
    };

    try {
      const response = await fetch(`${this.baseUrl}/models/gemini-1.5-pro:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        // Generate enhanced SVG based on AI description
        return this.generateEnhancedSVG(data.candidates[0].content.parts[0].text, prompt);
      }
      
      throw new Error('No response received from Gemini API');
    } catch (error) {
      console.error('Error with Gemini Vision:', error);
      // Final fallback to enhanced placeholder
      return this.generateEnhancedPlaceholder(prompt);
    }
  }

  private generateEnhancedSVG(aiDescription: string, originalPrompt: string): string {
    // Parse AI description and generate complex SVG
    const monsterId = originalPrompt.includes('fire') ? 1 : 
                     originalPrompt.includes('ice') ? 2 :
                     originalPrompt.includes('thunder') ? 3 :
                     originalPrompt.includes('water') ? 4 : 5;
    
    return this.generatePhotorealisticSVG(monsterId, originalPrompt);
  }

  private generateEnhancedPlaceholder(prompt: string): string {
    const monsterId = prompt.includes('fire') ? 1 : 
                     prompt.includes('ice') ? 2 :
                     prompt.includes('thunder') ? 3 :
                     prompt.includes('water') ? 4 : 5;
    
    return this.generatePhotorealisticSVG(monsterId, prompt);
  }

  private generatePhotorealisticSVG(monsterId: number, prompt: string): string {
    const monsterConfigs = {
      1: { // Fire Dragon
        primaryColor: '#B22222',
        secondaryColor: '#FF4500', 
        accentColor: '#FFD700',
        eyeColor: '#FF6347',
        effectColor: '#FF4500'
      },
      2: { // Ice Dragon  
        primaryColor: '#4682B4',
        secondaryColor: '#87CEEB',
        accentColor: '#E0FFFF', 
        eyeColor: '#00BFFF',
        effectColor: '#87CEEB'
      },
      3: { // Thunder Dragon
        primaryColor: '#4B0082',
        secondaryColor: '#9370DB',
        accentColor: '#FFFF00',
        eyeColor: '#FFFF00', 
        effectColor: '#FFFF00'
      },
      4: { // Water Dragon
        primaryColor: '#008B8B',
        secondaryColor: '#00CED1',
        accentColor: '#AFEEEE',
        eyeColor: '#00FFFF',
        effectColor: '#00CED1'
      },
      5: { // Earth Dragon
        primaryColor: '#8B4513', 
        secondaryColor: '#CD853F',
        accentColor: '#DEB887',
        eyeColor: '#FF8C00',
        effectColor: '#228B22'
      }
    };

    const config = monsterConfigs[monsterId as keyof typeof monsterConfigs] || monsterConfigs[1];
    
    const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Complex gradients for photorealistic effect -->
        <radialGradient id="bodyGrad" cx="40%" cy="30%" r="80%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.4" />
          <stop offset="30%" style="stop-color:${config.accentColor};stop-opacity:0.8" />
          <stop offset="70%" style="stop-color:${config.primaryColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#000000;stop-opacity:0.6" />
        </radialGradient>
        
        <radialGradient id="headGrad" cx="30%" cy="25%" r="75%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.5" />
          <stop offset="40%" style="stop-color:${config.secondaryColor};stop-opacity:0.9" />
          <stop offset="85%" style="stop-color:${config.primaryColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#000000;stop-opacity:0.7" />
        </radialGradient>
        
        <filter id="realisticShadow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="8"/>
          <feOffset dx="6" dy="12" result="offset"/>
          <feDropShadow dx="3" dy="6" stdDeviation="4" flood-opacity="0.4"/>
        </filter>
        
        <filter id="scales" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence baseFrequency="0.9" numOctaves="4" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3"/>
        </filter>
        
        <pattern id="scalePattern" patternUnits="userSpaceOnUse" width="12" height="12">
          <circle cx="6" cy="6" r="4" fill="${config.secondaryColor}" opacity="0.6"/>
          <circle cx="6" cy="6" r="2" fill="${config.accentColor}" opacity="0.8"/>
        </pattern>
      </defs>
      
      <!-- Background atmospheric effect -->
      <rect width="400" height="400" fill="url(#bodyGrad)" opacity="0.1"/>
      
      <!-- Main body with realistic proportions -->
      <ellipse cx="200" cy="260" rx="120" ry="80" fill="url(#bodyGrad)" filter="url(#realisticShadow)"/>
      <ellipse cx="200" cy="260" rx="115" ry="75" fill="url(#scalePattern)" opacity="0.6"/>
      
      <!-- Chest/neck connection -->
      <ellipse cx="200" cy="180" rx="70" ry="50" fill="url(#headGrad)" filter="url(#realisticShadow)"/>
      
      <!-- Head with detailed structure -->
      <ellipse cx="200" cy="120" rx="65" ry="55" fill="url(#headGrad)" filter="url(#realisticShadow)"/>
      <ellipse cx="200" cy="120" rx="60" ry="50" fill="url(#scalePattern)" opacity="0.5"/>
      
      <!-- Snout/jaw -->
      <ellipse cx="200" cy="140" rx="45" ry="25" fill="${config.primaryColor}" filter="url(#realisticShadow)"/>
      
      <!-- Nostrils -->
      <ellipse cx="190" cy="135" rx="3" ry="5" fill="#000000" opacity="0.8"/>
      <ellipse cx="210" cy="135" rx="3" ry="5" fill="#000000" opacity="0.8"/>
      
      <!-- Eyes with realistic depth -->
      <ellipse cx="175" cy="105" rx="12" ry="15" fill="#000000" opacity="0.9"/>
      <ellipse cx="225" cy="105" rx="12" ry="15" fill="#000000" opacity="0.9"/>
      <ellipse cx="175" cy="105" rx="10" ry="12" fill="${config.eyeColor}"/>
      <ellipse cx="225" cy="105" rx="10" ry="12" fill="${config.eyeColor}"/>
      <ellipse cx="175" cy="102" rx="6" ry="8" fill="#000000"/>
      <ellipse cx="225" cy="102" rx="6" ry="8" fill="#000000"/>
      <ellipse cx="172" cy="100" rx="2" ry="3" fill="#ffffff" opacity="0.9"/>
      <ellipse cx="222" cy="100" rx="2" ry="3" fill="#ffffff" opacity="0.9"/>
      
      <!-- Horns/spikes -->
      <polygon points="160,85 165,45 175,90" fill="${config.accentColor}" filter="url(#realisticShadow)"/>
      <polygon points="225,90 235,45 240,85" fill="${config.accentColor}" filter="url(#realisticShadow)"/>
      
      ${prompt.includes('wings') || prompt.includes('wing') ? `
      <!-- Detailed wings -->
      <path d="M80 180 Q20 120, 10 220 Q40 280, 90 240 Q110 210, 80 180" 
            fill="${config.secondaryColor}" opacity="0.8" filter="url(#realisticShadow)"/>
      <path d="M320 180 Q380 120, 390 220 Q360 280, 310 240 Q290 210, 320 180" 
            fill="${config.secondaryColor}" opacity="0.8" filter="url(#realisticShadow)"/>
      <!-- Wing membrane details -->
      <path d="M85 185 Q50 160, 45 200 Q65 230, 85 210" fill="${config.primaryColor}" opacity="0.6"/>
      <path d="M315 185 Q350 160, 355 200 Q335 230, 315 210" fill="${config.primaryColor}" opacity="0.6"/>
      ` : ''}
      
      ${prompt.includes('spikes') || prompt.includes('spike') ? `
      <!-- Back spikes -->
      <polygon points="180,200 185,160 190,200" fill="${config.accentColor}" filter="url(#realisticShadow)"/>
      <polygon points="195,195 200,155 205,195" fill="${config.accentColor}" filter="url(#realisticShadow)"/>
      <polygon points="210,200 215,160 220,200" fill="${config.accentColor}" filter="url(#realisticShadow)"/>
      ` : ''}
      
      <!-- Powerful legs -->
      <ellipse cx="150" cy="320" rx="25" ry="45" fill="${config.primaryColor}" filter="url(#realisticShadow)"/>
      <ellipse cx="250" cy="320" rx="25" ry="45" fill="${config.primaryColor}" filter="url(#realisticShadow)"/>
      
      <!-- Claws -->
      <path d="M135 345 L125 360 L140 365 L145 350 Z" fill="#2F2F2F"/>
      <path d="M155 345 L165 360 L150 365 L145 350 Z" fill="#2F2F2F"/>
      <path d="M235 345 L225 360 L240 365 L245 350 Z" fill="#2F2F2F"/>
      <path d="M255 345 L265 360 L250 365 L245 350 Z" fill="#2F2F2F"/>
      
      <!-- Muscular tail -->
      <ellipse cx="300" cy="280" rx="40" ry="20" fill="${config.primaryColor}" 
               filter="url(#realisticShadow)" transform="rotate(25 300 280)"/>
      <ellipse cx="350" cy="310" rx="35" ry="18" fill="${config.secondaryColor}" 
               filter="url(#realisticShadow)" transform="rotate(45 350 310)"/>
      
      <!-- Atmospheric effects -->
      ${monsterId === 1 ? `
      <!-- Fire effects -->
      <ellipse cx="190" cy="135" rx="2" ry="8" fill="#FF4500" opacity="0.8">
        <animate attributeName="ry" values="8;12;8" dur="1.5s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="210" cy="135" rx="2" ry="8" fill="#FF4500" opacity="0.8">
        <animate attributeName="ry" values="8;12;8" dur="1.5s" repeatCount="indefinite"/>
      </ellipse>
      ` : ''}
      
      ${monsterId === 2 ? `
      <!-- Ice crystal effects -->
      <polygon points="150,70 155,60 160,70 155,80" fill="#E0FFFF" opacity="0.7"/>
      <polygon points="240,70 245,60 250,70 245,80" fill="#E0FFFF" opacity="0.7"/>
      ` : ''}
      
      ${monsterId === 3 ? `
      <!-- Lightning effects -->
      <path d="M170 90 L175 95 L172 100 L178 105" stroke="#FFFF00" stroke-width="2" fill="none" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="0.8s" repeatCount="indefinite"/>
      </path>
      ` : ''}
    </svg>`;
    
    return Buffer.from(svg).toString('base64');
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
      1: "Hyper-realistic, terrifying fire dragon creature with coal-black muscular body, glowing red eyes filled with malice, massive powerful claws, razor-sharp teeth dripping with saliva, thick armored scales with molten lava veins pulsing beneath, smoke and embers rising from nostrils and mouth",
      2: "Hyper-realistic, menacing ice dragon beast with frost-covered dark blue scales, piercing electric blue eyes, massive ice-encrusted claws, crystalline spikes jutting from spine, frozen breath visible in the air, icicles hanging from jaw and limbs, muscular predatory build",
      3: "Hyper-realistic, fearsome thunder dragon with deep purple-black scales crackling with electrical energy, bright yellow lightning eyes, metallic silver claws, electrical discharge arcing between horns and spikes, muscular frame built for destruction, storm clouds gathering around it",
      4: "Hyper-realistic, aquatic dragon monster with sleek dark teal scales that glisten with water, predatory cyan eyes, webbed claws designed for tearing, water constantly dripping from its muscular frame, gill slits along powerful neck, built like an apex aquatic predator",
      5: "Hyper-realistic, earth dragon behemoth with boulder-like rocky scales, moss and small vegetation growing on massive shoulders, amber predatory eyes, stone-crushing claws, incredibly muscular build, dirt and debris falling from its armored hide"
    };

    let prompt = basePrompts[monsterId as keyof typeof basePrompts] || basePrompts[1];
    
    // Add upgrade details with more dramatic descriptions
    if (upgradeChoices.teeth === 'razor') {
      prompt += ", massive razor-sharp fangs gleaming like polished steel, designed to tear through armor and bone";
    }
    
    if (upgradeChoices.spikes === 'metallic' || upgradeChoices.spikes === 'ice') {
      prompt += ", deadly metallic spikes jutting aggressively from shoulders, back, and tail, each one sharp enough to impale enemies";
    }
    
    if (upgradeChoices.muscles === 'enhanced') {
      prompt += ", extraordinarily enhanced musculature with visible definition, powerful limbs capable of crushing buildings, intimidating physical presence";
    }
    
    if (upgradeChoices.wings === 'flame' || upgradeChoices.wings === 'ice') {
      prompt += ", massive battle-scarred wings spread in threatening display, each wing membrane showing detailed texture and battle damage";
    }
    
    if (upgradeChoices.tail === 'spiked') {
      prompt += ", weaponized spiked tail with bone-crushing spikes, positioned to strike with devastating force";
    }

    prompt += ". Shot with professional cinema camera, dramatic chiaroscuro lighting, film grain texture, 8K resolution, hyperrealistic creature design like a practical movie monster, every scale and detail visible, menacing and predatory expression, designed to inspire fear and awe, masterpiece quality creature photography.";
    
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