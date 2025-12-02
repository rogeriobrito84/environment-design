import { GoogleGenAI } from "@google/genai";
import { GeneratedImage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Highly rigorous instruction set to prevent hallucinated scaling/zooming
const DIMENSION_PRESERVATION_INSTRUCTION = `
CRITICAL INSTRUCTIONS - READ CAREFULLY:

1.  **NO ZOOM / NO CROP**: The output image MUST have the exact same resolution, aspect ratio, and field of view as the input image. DO NOT zoom in. DO NOT pan the camera.
2.  **GEOMETRY LOCK**: The walls, floor, ceiling, and windows must remain in the EXACT same pixel coordinates.
3.  **OBJECT FREEZE**: If the prompt implies keeping an object (like a TV, a sofa, or "furniture"), you MUST NOT resize it. It must occupy the exact same pixels as the original.
4.  **IN-PAINTING LOGIC**: Treat this strictly as a material/texture swap for the requested changes. Do not re-render the structural geometry of the room.
5.  **OUTPUT FORMAT**: You must generate an image. Do not return only text.

NEGATIVE PROMPT (Implicit):
- DO NOT zoom in.
- DO NOT change the size of the TV.
- DO NOT change the perspective.
- DO NOT remove objects unless explicitly asked.
`.trim();

export const generateRedesign = async (
  base64Image: string,
  prompt: string,
  mimeType: string = "image/jpeg",
  aspectRatio: string = "1:1"
): Promise<{ image: GeneratedImage | null; text: string | null }> => {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const finalPrompt = `
      You are an expert interior design AI.
      
      USER REQUEST: "${prompt}"

      ${DIMENSION_PRESERVATION_INSTRUCTION}
    `.trim();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          // Sending image first establishes the visual anchor
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
          {
            text: finalPrompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any, 
        }
      },
    });

    let generatedImage: GeneratedImage | null = null;
    let generatedText: string | null = null;

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          generatedImage = {
            mimeType: part.inlineData.mimeType || "image/png",
            data: part.inlineData.data,
          };
        } else if (part.text) {
          generatedText = part.text;
        }
      }
    }

    return { image: generatedImage, text: generatedText };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};