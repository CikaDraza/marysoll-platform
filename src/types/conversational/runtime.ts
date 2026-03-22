// src/types/conversational/runtime.ts
import { LayoutBlock } from "./layout";
import { DragMeta } from "./layout";

export type RuntimeBlock = LayoutBlock & DragMeta;

export type RuntimeBlockByType<TType extends RuntimeBlock["type"]> = Extract<
  RuntimeBlock,
  { type: TType }
>;
