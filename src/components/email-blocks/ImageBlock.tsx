// components/email-blocks/ImageBlock.tsx
// TABLE-based layout, inline styles — Gmail/Outlook/Apple Mail compatible

import type { ImageBlockData } from "@/types/email/block-email-campaign";
import Link from "next/link";

interface Props {
  data: ImageBlockData;
}

export function ImageBlock({ data }: Props) {
  const imgWidth = data.width ?? "600";

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={data.src}
      alt={data.alt ?? ""}
      width={imgWidth}
      style={{
        display: "block",
        maxWidth: "100%",
        height: "auto",
        border: "0",
        margin: "0 auto",
      }}
    />
  );

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
            align="center"
            style={{
              padding: "16px 32px",
              textAlign: "center",
            }}
          >
            {data.link ? (
              <Link href={data.link} style={{ display: "inline-block" }}>
                {img}
              </Link>
            ) : (
              img
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
