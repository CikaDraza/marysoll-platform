// components/email-blocks/DividerBlock.tsx
// TABLE-based layout, inline styles — Gmail/Outlook/Apple Mail compatible

import type { DividerBlockData } from "@/types/email/block-email-campaign";

interface Props {
  data: DividerBlockData;
}

export function DividerBlock({ data }: Props) {
  const color = data.color ?? "#e5e7eb";
  const thickness = data.thickness ?? 1;

  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      style={{ width: "100%", borderCollapse: "collapse" }}
    >
      <tbody>
        <tr>
          <td style={{ padding: "8px 32px" }}>
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
                      borderTop: `${thickness}px solid ${color}`,
                      fontSize: "0",
                      lineHeight: "0",
                    }}
                  >
                    &nbsp;
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
