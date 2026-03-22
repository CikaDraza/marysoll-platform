import { Schema, SchemaType } from "@google/generative-ai";

export interface Input {
  titleSeed?: string;
  content: string;
  keywords?: string[];
}

export const seoSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    keywords: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    ogTitle: { type: SchemaType.STRING },
    ogDescription: { type: SchemaType.STRING },
  },
  required: ["title", "description", "keywords", "ogTitle", "ogDescription"],
};
