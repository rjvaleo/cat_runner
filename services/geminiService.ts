
import { GoogleGenAI, Type } from "@google/genai";
import { CellType, LevelData } from "../types";
import { GRID_WIDTH, GRID_HEIGHT } from "../constants";

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
      },
      description: `A 2D array [row][col] size ${GRID_HEIGHT}x${GRID_WIDTH}. 0=Empty, 1=Brick, 2=Solid, 3=Ladder, 4=Gold.`
    }
  },
  required: ["name", "description", "playerStart", "enemies", "grid"]
};

export const generateAiLevel = async (theme: string): Promise<LevelData> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Design a Lode Purrer (Lode Runner clone) level with the theme: "${theme}". 
      CRITICAL SAFETY CONSTRAINTS:
      - Size: Exactly ${GRID_WIDTH} columns by ${GRID_HEIGHT} rows.
      - Boundaries: The entire outer perimeter (Row 0, Row ${GRID_HEIGHT-1}, Col 0, Col ${GRID_WIDTH-1}) MUST be Solid (2).
      - Player Start: The cell at playerStart.x, playerStart.y MUST be Empty (0).
      - Player Floor: The cell directly below the player (playerStart.y + 1) MUST be Solid (2) or Brick (1).
      - Traversability: Include MANY ladders (3). Ensure every part of the level is reachable.
      - Objectives: Place 6-12 Gold fish (4) in challenging but reachable spots.
      - Enemies: Place 1-2 enemies (Dogs) far away from the player start.
      Return ONLY valid JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: levelSchema,
      }
    });

    let text = response.text.trim();
    const level = JSON.parse(text) as LevelData;
    
    // Safety processing for grid dimensions
    const processedGrid = level.grid.slice(0, GRID_HEIGHT).map(row => {
        const newRow = row.slice(0, GRID_WIDTH);
        while(newRow.length < GRID_WIDTH) newRow.push(CellType.SOLID);
        return newRow;
    });
    while(processedGrid.length < GRID_HEIGHT) processedGrid.push(new Array(GRID_WIDTH).fill(CellType.SOLID));

    // Force player start to be empty just in case
    if (processedGrid[level.playerStart.y]) {
      processedGrid[level.playerStart.y][level.playerStart.x] = CellType.EMPTY;
    }

    return { ...level, grid: processedGrid };
  } catch (error) {
    console.error("AI Gen Failed:", error);
    throw error;
  }
};
