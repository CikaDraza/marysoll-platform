"use client";

interface TextBlockProps {
  block: {
    id: string;
    role?: string;
    type: "TextBlock";
    content: string;
  };
}

export default function TextBlock({ block }: TextBlockProps) {
  return (
    <div id={block.id} className="rounded-md bg-gray-50 p-3 text-sm">
      {block.role && (
        <p className="mb-1 text-xs font-semibold uppercase text-gray-500">
          {block.role}
        </p>
      )}
      <p className="whitespace-pre-wrap text-gray-800">{block.content}</p>
    </div>
  );
}
