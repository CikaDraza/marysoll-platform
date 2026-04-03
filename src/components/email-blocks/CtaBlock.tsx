// components/email-blocks/CtaBlock.tsx
// TABLE-based layout, inline styles — Gmail/Outlook/Apple Mail compatible

import type { CtaBlockData } from "@/types/email/block-email-campaign";

interface Props {
  data: CtaBlockData;
}

export function CtaBlock({ data }: Props) {
  const bg = data.backgroundColor ?? "#7c3aed";
  const color = data.textColor ?? "#ffffff";
  const href = data.url ?? "#";

  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      style={{ width: "100%", borderCollapse: "collapse" }}
    >
      <tbody>
        <tr>
          <td style={{ padding: "24px 32px", textAlign: "center" }}>
            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              style={{ margin: "0 auto", borderCollapse: "collapse" }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      backgroundColor: bg,
                      borderRadius: "8px",
                    }}
                  >
                    <a
                      href={href}
                      style={{
                        display: "inline-block",
                        padding: "14px 32px",
                        fontFamily: "Arial, Helvetica, sans-serif",
                        fontSize: "16px",
                        fontWeight: "bold",
                        color: color,
                        textDecoration: "none",
                        borderRadius: "8px",
                      }}
                    >
                      {data.text}
                    </a>
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
