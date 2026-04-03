// components/email-blocks/BulletsBlock.tsx
// TABLE-based layout, inline styles — Gmail/Outlook/Apple Mail compatible

import type { BulletsBlockData } from "@/types/email/block-email-campaign";

interface Props {
  data: BulletsBlockData;
}

export function BulletsBlock({ data }: Props) {
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      style={{ width: "100%", borderCollapse: "collapse" }}
    >
      <tbody>
        <tr>
          <td style={{ padding: "24px 32px" }}>
            {data.heading && (
              <p
                style={{
                  margin: "0 0 16px 0",
                  fontFamily: "Arial, Helvetica, sans-serif",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#111827",
                }}
              >
                {data.heading}
              </p>
            )}
            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              style={{ width: "100%", borderCollapse: "collapse" }}
            >
              <tbody>
                {data.items.map((item, i) => (
                  <tr key={i}>
                    <td
                      style={{
                        paddingBottom: "10px",
                        verticalAlign: "top",
                        width: "20px",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Arial, Helvetica, sans-serif",
                          fontSize: "15px",
                          color: "#7c3aed",
                          fontWeight: "bold",
                        }}
                      >
                        ✓
                      </span>
                    </td>
                    <td style={{ paddingBottom: "10px", paddingLeft: "8px" }}>
                      <span
                        style={{
                          fontFamily: "Arial, Helvetica, sans-serif",
                          fontSize: "15px",
                          lineHeight: "1.5",
                          color: "#374151",
                        }}
                      >
                        {item}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
