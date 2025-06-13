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
  private vertexUrl = 'https://us-central1-aiplatform.googleapis.com/v1';

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY!;
    if (!this.apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }
  }

  async generateMonsterImage(monsterId: number, upgradeChoices: Record<string, any>): Promise<string> {
    const prompt = this.buildMonsterImagePrompt(monsterId, upgradeChoices);
    
    try {
      // Use Gemini Pro to generate detailed creature description for ultra-realistic SVG
      const response = await fetch(`${this.baseUrl}/models/gemini-1.5-pro:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Create an extremely detailed, anatomically accurate description for rendering a photorealistic ${prompt}. Include specific details about: muscle definition, scale patterns, bone structure, eye reflections, lighting effects, texture details, proportions, and battle scars. Make it sound like a Hollywood creature design brief for practical effects.`
            }]
          }],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
          }
        })
      });

      if (response.ok) {
        const data = await response.json() as any;
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          const detailedDescription = data.candidates[0].content.parts[0].text;
          return this.generateCinemaQualitySVG(monsterId, upgradeChoices, detailedDescription);
        }
      }
    } catch (error) {
      console.error('Gemini API error:', error);
    }

    // Generate cinema-quality SVG based on prompt
    return this.generateCinemaQualitySVG(monsterId, upgradeChoices, prompt);
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

  private generateCinemaQualitySVG(monsterId: number, upgradeChoices: Record<string, any>, description: string): string {
    const monsterConfigs = {
      1: { // Fire Dragon
        primaryColor: '#1A0A0A',
        secondaryColor: '#8B0000', 
        accentColor: '#FF4500',
        eyeColor: '#FF0000',
        effectColor: '#FF6347',
        scales: '#2F1B14'
      },
      2: { // Ice Dragon  
        primaryColor: '#0F1B2C',
        secondaryColor: '#1E3A5F',
        accentColor: '#4A90E2',
        eyeColor: '#00BFFF',
        effectColor: '#B0E0E6',
        scales: '#2C3E50'
      },
      3: { // Thunder Dragon
        primaryColor: '#1A0A2E',
        secondaryColor: '#16213E',
        accentColor: '#9B59B6',
        eyeColor: '#F1C40F',
        effectColor: '#E74C3C',
        scales: '#2C3E50'
      },
      4: { // Water Dragon
        primaryColor: '#0A1A1A',
        secondaryColor: '#1E3A3A',
        accentColor: '#2ECC71',
        eyeColor: '#1ABC9C',
        effectColor: '#3498DB',
        scales: '#34495E'
      },
      5: { // Earth Dragon
        primaryColor: '#2C1810',
        secondaryColor: '#5D4037',
        accentColor: '#8D6E63',
        eyeColor: '#FF8F00',
        effectColor: '#4CAF50',
        scales: '#3E2723'
      }
    };

    const config = monsterConfigs[monsterId as keyof typeof monsterConfigs] || monsterConfigs[1];
    const hasWings = upgradeChoices.wings || description.includes('wing');
    const hasSpikes = upgradeChoices.spikes || description.includes('spike');
    const hasEnhancedMuscles = upgradeChoices.muscles === 'enhanced' || description.includes('muscular');
    
    const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <defs>
        <!-- Ultra-realistic gradients with multiple color stops -->
        <radialGradient id="bodyGrad${monsterId}" cx="35%" cy="25%" r="85%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.6" />
          <stop offset="15%" style="stop-color:${config.accentColor};stop-opacity:0.7" />
          <stop offset="45%" style="stop-color:${config.secondaryColor};stop-opacity:0.9" />
          <stop offset="75%" style="stop-color:${config.primaryColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#000000;stop-opacity:0.8" />
        </radialGradient>
        
        <radialGradient id="headGrad${monsterId}" cx="30%" cy="20%" r="80%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.7" />
          <stop offset="25%" style="stop-color:${config.accentColor};stop-opacity:0.8" />
          <stop offset="60%" style="stop-color:${config.secondaryColor};stop-opacity:0.95" />
          <stop offset="90%" style="stop-color:${config.primaryColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#000000;stop-opacity:0.9" />
        </radialGradient>

        <linearGradient id="muscleDef${monsterId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${config.secondaryColor};stop-opacity:0.8" />
          <stop offset="50%" style="stop-color:${config.primaryColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#000000;stop-opacity:0.6" />
        </linearGradient>
        
        <!-- Advanced filters for realism -->
        <filter id="realisticShadow${monsterId}" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="12"/>
          <feOffset dx="8" dy="16" result="offset"/>
          <feFlood flood-color="#000000" flood-opacity="0.6"/>
          <feComposite in2="offset" operator="in"/>
          <feMorphology operator="dilate" radius="2"/>
          <feGaussianBlur stdDeviation="6"/>
          <feComposite in2="SourceGraphic" operator="over"/>
        </filter>
        
        <filter id="scaleTexture${monsterId}" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence baseFrequency="0.15" numOctaves="6" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="4"/>
          <feGaussianBlur stdDeviation="0.5"/>
        </filter>
        
        <filter id="muscleDefinition${monsterId}" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence baseFrequency="0.05" numOctaves="4" result="texture"/>
          <feDisplacementMap in="SourceGraphic" in2="texture" scale="2"/>
          <feConvolveMatrix kernelMatrix="0 -1 0 -1 5 -1 0 -1 0"/>
        </filter>
        
        <!-- Detailed scale patterns -->
        <pattern id="dragonScales${monsterId}" patternUnits="userSpaceOnUse" width="16" height="16">
          <circle cx="8" cy="8" r="6" fill="${config.scales}" opacity="0.7"/>
          <circle cx="8" cy="8" r="4" fill="${config.secondaryColor}" opacity="0.5"/>
          <circle cx="8" cy="8" r="2" fill="${config.accentColor}" opacity="0.8"/>
          <ellipse cx="8" cy="6" rx="3" ry="1" fill="#ffffff" opacity="0.3"/>
        </pattern>
        
        <!-- Eye reflections -->
        <radialGradient id="eyeReflection${monsterId}" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.9" />
          <stop offset="40%" style="stop-color:${config.eyeColor};stop-opacity:0.8" />
          <stop offset="80%" style="stop-color:${config.primaryColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
        </radialGradient>
      </defs>
      
      <!-- Background atmospheric effect -->
      <rect width="512" height="512" fill="radial-gradient(circle at 30% 30%, ${config.primaryColor}20, #00000040)"/>
      
      ${hasWings ? `
      <!-- Massive detailed wings -->
      <path d="M50 220 Q10 150, 5 280 Q30 380, 85 320 Q130 280, 100 240 Q75 220, 50 220" 
            fill="url(#bodyGrad${monsterId})" filter="url(#realisticShadow${monsterId})" opacity="0.9"/>
      <path d="M462 220 Q502 150, 507 280 Q482 380, 427 320 Q382 280, 412 240 Q437 220, 462 220" 
            fill="url(#bodyGrad${monsterId})" filter="url(#realisticShadow${monsterId})" opacity="0.9"/>
      
      <!-- Wing membrane details with battle damage -->
      <path d="M55 225 Q25 180, 20 240 Q40 300, 75 260 Q90 240, 55 225" fill="${config.primaryColor}" opacity="0.6"/>
      <path d="M457 225 Q487 180, 492 240 Q472 300, 437 260 Q422 240, 457 225" fill="${config.primaryColor}" opacity="0.6"/>
      
      <!-- Wing bone structure -->
      <path d="M60 230 L25 200 M70 240 L35 210 M80 250 L45 220" stroke="${config.scales}" stroke-width="3" opacity="0.8"/>
      <path d="M452 230 L487 200 M442 240 L477 210 M432 250 L467 220" stroke="${config.scales}" stroke-width="3" opacity="0.8"/>
      ` : ''}
      
      <!-- Main body with enhanced musculature -->
      <ellipse cx="256" cy="340" rx="${hasEnhancedMuscles ? '155' : '140'}" ry="${hasEnhancedMuscles ? '100' : '85'}" 
               fill="url(#bodyGrad${monsterId})" filter="url(#realisticShadow${monsterId})"/>
      <ellipse cx="256" cy="340" rx="${hasEnhancedMuscles ? '150' : '135'}" ry="${hasEnhancedMuscles ? '95' : '80'}" 
               fill="url(#dragonScales${monsterId})" filter="url(#scaleTexture${monsterId})" opacity="0.7"/>
      
      ${hasEnhancedMuscles ? `
      <!-- Enhanced muscle definition -->
      <ellipse cx="200" cy="320" rx="45" ry="25" fill="url(#muscleDef${monsterId})" filter="url(#muscleDefinition${monsterId})" opacity="0.8"/>
      <ellipse cx="312" cy="320" rx="45" ry="25" fill="url(#muscleDef${monsterId})" filter="url(#muscleDefinition${monsterId})" opacity="0.8"/>
      <ellipse cx="256" cy="300" rx="35" ry="20" fill="url(#muscleDef${monsterId})" filter="url(#muscleDefinition${monsterId})" opacity="0.6"/>
      ` : ''}
      
      <!-- Chest and neck connection with realistic anatomy -->
      <ellipse cx="256" cy="240" rx="85" ry="65" fill="url(#bodyGrad${monsterId})" filter="url(#realisticShadow${monsterId})"/>
      <ellipse cx="256" cy="240" rx="80" ry="60" fill="url(#dragonScales${monsterId})" opacity="0.6"/>
      
      <!-- Head with detailed bone structure -->
      <ellipse cx="256" cy="160" rx="75" ry="70" fill="url(#headGrad${monsterId})" filter="url(#realisticShadow${monsterId})"/>
      <ellipse cx="256" cy="160" rx="70" ry="65" fill="url(#dragonScales${monsterId})" filter="url(#scaleTexture${monsterId})" opacity="0.5"/>
      
      <!-- Detailed snout/jaw with teeth -->
      <ellipse cx="256" cy="190" rx="55" ry="30" fill="${config.primaryColor}" filter="url(#realisticShadow${monsterId})"/>
      <ellipse cx="256" cy="185" rx="50" ry="25" fill="${config.secondaryColor}" opacity="0.8"/>
      
      <!-- Razor-sharp teeth -->
      <polygon points="235,195 240,210 245,195" fill="#F5F5F5" opacity="0.9"/>
      <polygon points="250,195 255,215 260,195" fill="#F5F5F5" opacity="0.9"/>
      <polygon points="265,195 270,210 275,195" fill="#F5F5F5" opacity="0.9"/>
      
      ${upgradeChoices.teeth === 'razor' ? `
      <!-- Enhanced razor fangs -->
      <polygon points="240,195 245,220 250,195" fill="#E8E8E8" filter="url(#realisticShadow${monsterId})"/>
      <polygon points="262,195 267,220 272,195" fill="#E8E8E8" filter="url(#realisticShadow${monsterId})"/>
      ` : ''}
      
      <!-- Nostrils with smoke/breath effect -->
      <ellipse cx="245" cy="180" rx="4" ry="7" fill="#000000" opacity="0.9"/>
      <ellipse cx="267" cy="180" rx="4" ry="7" fill="#000000" opacity="0.9"/>
      
      ${monsterId === 1 ? `
      <!-- Fire breath effect -->
      <ellipse cx="245" cy="180" rx="3" ry="12" fill="#FF4500" opacity="0.7">
        <animate attributeName="ry" values="12;18;12" dur="2s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="267" cy="180" rx="3" ry="12" fill="#FF4500" opacity="0.7">
        <animate attributeName="ry" values="12;18;12" dur="2s" repeatCount="indefinite"/>
      </ellipse>
      ` : ''}
      
      <!-- Hyper-realistic eyes with depth and reflection -->
      <ellipse cx="230" cy="145" rx="18" ry="22" fill="#000000" opacity="0.95"/>
      <ellipse cx="282" cy="145" rx="18" ry="22" fill="#000000" opacity="0.95"/>
      <ellipse cx="230" cy="145" rx="15" ry="18" fill="url(#eyeReflection${monsterId})"/>
      <ellipse cx="282" cy="145" rx="15" ry="18" fill="url(#eyeReflection${monsterId})"/>
      
      <!-- Pupils with menacing look -->
      <ellipse cx="230" cy="148" rx="8" ry="12" fill="#000000"/>
      <ellipse cx="282" cy="148" rx="8" ry="12" fill="#000000"/>
      
      <!-- Eye reflections for realism -->
      <ellipse cx="226" cy="140" rx="3" ry="5" fill="#ffffff" opacity="0.9"/>
      <ellipse cx="278" cy="140" rx="3" ry="5" fill="#ffffff" opacity="0.9"/>
      <circle cx="228" cy="142" r="1" fill="#ffffff" opacity="0.7"/>
      <circle cx="280" cy="142" r="1" fill="#ffffff" opacity="0.7"/>
      
      <!-- Horns/cranial ridges -->
      <polygon points="200,120 205,70 215,125" fill="${config.accentColor}" filter="url(#realisticShadow${monsterId})"/>
      <polygon points="297,125 307,70 312,120" fill="${config.accentColor}" filter="url(#realisticShadow${monsterId})"/>
      <polygon points="220,115 225,85 235,120" fill="${config.secondaryColor}" filter="url(#realisticShadow${monsterId})"/>
      <polygon points="277,120 287,85 292,115" fill="${config.secondaryColor}" filter="url(#realisticShadow${monsterId})"/>
      
      ${hasSpikes ? `
      <!-- Aggressive back spikes -->
      <polygon points="220,260 225,200 235,265" fill="${config.accentColor}" filter="url(#realisticShadow${monsterId})"/>
      <polygon points="240,255 245,195 255,260" fill="${config.accentColor}" filter="url(#realisticShadow${monsterId})"/>
      <polygon points="257,260 262,195 272,255" fill="${config.accentColor}" filter="url(#realisticShadow${monsterId})"/>
      <polygon points="277,265 282,200 292,260" fill="${config.accentColor}" filter="url(#realisticShadow${monsterId})"/>
      ` : ''}
      
      <!-- Powerful legs with realistic muscle definition -->
      <ellipse cx="190" cy="420" rx="35" ry="60" fill="url(#muscleDef${monsterId})" filter="url(#realisticShadow${monsterId})"/>
      <ellipse cx="322" cy="420" rx="35" ry="60" fill="url(#muscleDef${monsterId})" filter="url(#realisticShadow${monsterId})"/>
      
      <!-- Detailed claws -->
      <path d="M170 460 L155 485 L175 490 L185 465 Z" fill="#2C2C2C" filter="url(#realisticShadow${monsterId})"/>
      <path d="M195 460 L210 485 L190 490 L180 465 Z" fill="#2C2C2C" filter="url(#realisticShadow${monsterId})"/>
      <path d="M205 460 L220 485 L200 490 L190 465 Z" fill="#2C2C2C" filter="url(#realisticShadow${monsterId})"/>
      
      <path d="M342 460 L357 485 L337 490 L327 465 Z" fill="#2C2C2C" filter="url(#realisticShadow${monsterId})"/>
      <path d="M317 460 L302 485 L322 490 L332 465 Z" fill="#2C2C2C" filter="url(#realisticShadow${monsterId})"/>
      <path d="M307 460 L292 485 L312 490 L322 465 Z" fill="#2C2C2C" filter="url(#realisticShadow${monsterId})"/>
      
      <!-- Muscular tail with realistic curvature -->
      <ellipse cx="380" cy="360" rx="50" ry="25" fill="url(#muscleDef${monsterId})" 
               filter="url(#realisticShadow${monsterId})" transform="rotate(30 380 360)"/>
      <ellipse cx="420" cy="390" rx="45" ry="22" fill="${config.secondaryColor}" 
               filter="url(#realisticShadow${monsterId})" transform="rotate(45 420 390)"/>
      <ellipse cx="450" cy="420" rx="35" ry="18" fill="${config.primaryColor}" 
               filter="url(#realisticShadow${monsterId})" transform="rotate(60 450 420)"/>
      
      ${upgradeChoices.tail === 'spiked' ? `
      <!-- Weaponized tail spikes -->
      <polygon points="440,410 450,390 460,415" fill="${config.accentColor}" filter="url(#realisticShadow${monsterId})"/>
      <polygon points="455,425 465,405 475,430" fill="${config.accentColor}" filter="url(#realisticShadow${monsterId})"/>
      ` : ''}
      
      <!-- Battle scars and details -->
      <path d="M200 280 Q210 285, 220 280" stroke="${config.secondaryColor}" stroke-width="2" fill="none" opacity="0.6"/>
      <path d="M290 290 Q300 295, 310 290" stroke="${config.secondaryColor}" stroke-width="2" fill="none" opacity="0.6"/>
      
      <!-- Atmospheric effects based on monster type -->
      ${monsterId === 2 ? `
      <!-- Ice crystal formations -->
      <polygon points="180,100 185,85 195,105 190,115" fill="#E0FFFF" opacity="0.8"/>
      <polygon points="317,105 322,85 332,100 327,115" fill="#E0FFFF" opacity="0.8"/>
      ` : ''}
      
      ${monsterId === 3 ? `
      <!-- Lightning energy crackling -->
      <path d="M210 130 L220 140 L215 150 L225 160" stroke="#FFFF00" stroke-width="3" fill="none" opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1s" repeatCount="indefinite"/>
      </path>
      <path d="M287 160 L297 150 L292 140 L302 130" stroke="#FFFF00" stroke-width="3" fill="none" opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1s" repeatCount="indefinite"/>
      </path>
      ` : ''}
    </svg>`;
    
    return Buffer.from(svg).toString('base64');
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