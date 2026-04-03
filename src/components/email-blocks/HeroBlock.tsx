// components/email-blocks/HeroBlock.tsx
// TABLE-based layout, inline styles — Gmail/Outlook/Apple Mail compatible

import type { HeroBlockData } from "@/types/email/block-email-campaign";

interface Props {
  data: HeroBlockData;
}

export function HeroBlock({ data }: Props) {
  const bg = data.backgroundUrl
    ? `url(${data.backgroundUrl}) center center / cover no-repeat`
    : "linear-gradient(135deg, #6d28d9 0%, #a21caf 100%)";

  const textColor = data.textColor ?? "#ffffff";

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
              background: bg,
              padding: "48px 32px",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                margin: "0 0 12px 0",
                fontFamily: "Arial, Helvetica, sans-serif",
                fontSize: "32px",
                fontWeight: "bold",
                lineHeight: "1.2",
                color: textColor,
              }}
            >
              {data.headline}
            </h1>
            {data.subheadline && (
              <p
                style={{
                  margin: "0",
                  fontFamily: "Arial, Helvetica, sans-serif",
                  fontSize: "16px",
                  lineHeight: "1.5",
                  color: textColor,
                  opacity: 0.9,
                }}
              >
                {data.subheadline}
              </p>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
