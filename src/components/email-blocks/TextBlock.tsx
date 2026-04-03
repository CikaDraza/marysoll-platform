// components/email-blocks/TextBlock.tsx
// TABLE-based layout, inline styles — Gmail/Outlook/Apple Mail compatible

import type { TextBlockData } from "@/types/email/block-email-campaign";

interface Props {
  data: TextBlockData;
}

export function TextBlock({ data }: Props) {
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      style={{ width: "100%", borderCollapse: "collapse" }}
    >
      <tbody>
        <tr>
          <td
            style={{
              padding: "24px 32px",
              textAlign: data.align ?? "left",
            }}
          >
            <p
              style={{
                margin: "0",
                fontFamily: "Arial, Helvetica, sans-serif",
                fontSize: "15px",
                lineHeight: "1.7",
                color: "#374151",
              }}
            >
              {data.content}
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
