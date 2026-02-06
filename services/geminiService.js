
import { GoogleGenAI, Type } from "@google/genai";
import { CellType } from "../types.js";
import { GRID_WIDTH, GRID_HEIGHT } from "../constants.js";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const levelSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    playerStart: {
      type: Type.OBJECT,
      properties: {
        x: { type: Type.INTEGER },
        y: { type: Type.INTEGER }
      },
      required: ["x", "y"]
    },
    enemies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          x: { type: Type.INTEGER },
          y: { type: Type.INTEGER }
        },
        required: ["x", "y"]
      }
    },
    grid: {
      type: Type.ARRAY,
      items: {
        type: Type.ARRAY,
        items: { type: Type.INTEGER }
      }
    }
  },
  required: ["name", "description", "playerStart", "enemies", "grid"]
};

export const generateAiLevel = async (theme) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Design a Lode Purrer level: "${theme}". Outer boundaries (Row 0, ${GRID_HEIGHT-1}, Col 0, ${GRID_WIDTH-1}) MUST be Solid (2).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: levelSchema,
      }
    });

    const level = JSON.parse(response.text.trim());
    const processedGrid = level.grid.slice(0, GRID_HEIGHT).map(row => {
        const newRow = row.slice(0, GRID_WIDTH);
        while(newRow.length < GRID_WIDTH) newRow.push(CellType.SOLID);
        return newRow;
    });
    if (processedGrid[level.playerStart.y]) {
      processedGrid[level.playerStart.y][level.playerStart.x] = CellType.EMPTY;
    }
    return { ...level, grid: processedGrid };
  } catch (error) {
    console.error("AI Gen Failed:", error);
    throw error;
  }
};
