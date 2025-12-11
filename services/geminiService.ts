import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, PlaceResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are CommuteWise AI, a friendly and helpful commuter assistant specifically for the Tandang Sora Jeepney Route in Quezon City, Philippines.
The specific route is **Tandang Sora Avenue (Commonwealth Market)** to **Maharlika, Quezon City**.
The jeepney passes through:
- Tandang Sora Market
- Visayas Avenue
- Congressional Avenue Intersection
- Elliptical Road (QC Circle area)
- Kalayaan Avenue
- QC City Hall
- Maharlika Street (Teacher's Village/Diliman area)

Your goal is to help commuters find landmarks, understand traffic patterns (general knowledge), and plan their trips along this route.

If a user asks about specific places (restaurants, landmarks, banks) near the route, use the 'googleMaps' tool to find real information.
Always be concise, practical, and mobile-friendly in your responses.
`;

export const getGeminiResponse = async (
  history: ChatMessage[],
  userMessage: string,
  userLocation?: { lat: number; lng: number }
): Promise<{ text: string; places?: PlaceResult[] }> => {
  
  try {
    const model = "gemini-2.5-flash";
    
    // Prepare tools configuration
    const tools = [
      { googleMaps: {} } // Enable Google Maps Grounding
    ];

    const toolConfig = userLocation ? {
      retrievalConfig: {
        latLng: {
          latitude: userLocation.lat,
          longitude: userLocation.lng
        }
      }
    } : undefined;

    const contents = [
      ...history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      })),
      {
        role: 'user',
        parts: [{ text: userMessage }]
      }
    ];

    const response = await ai.models.generateContent({
      model,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools,
        toolConfig,
      },
      contents: contents.map(c => ({ role: c.role, parts: c.parts }))
    });

    const text = response.text || "I'm having trouble connecting to the network right now. Please try again.";
    
    // Extract grounding chunks if available
    const places: PlaceResult[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.maps) {
          places.push({
            title: chunk.maps.title,
            uri: chunk.maps.uri
          });
        }
      });
    }

    return { text, places };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { 
      text: "Sorry, I encountered an error while processing your request. Please ensure your API key is valid.", 
      places: [] 
    };
  }
};