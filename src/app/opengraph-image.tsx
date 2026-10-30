import { ImageResponse } from "next/og";

// Site-wide default OG image (E-01 item 9): house tokens — dark base and the
// signature acid green — with the "Empire State" wordmark. Copy on the image
// ("Field notes · New York") comes from the home page's own kicker.
export const alt = "Empire State — Field notes · New York";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#09090b",
          padding: "96px 112px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: 160,
            height: 8,
            background: "#8FE83A",
            marginBottom: 48,
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 120,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: "#e8e8e4",
          }}
        >
          Empire State
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 36,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#8b8b85",
          }}
        >
          Field notes · New York
        </div>
      </div>
    ),
    { ...size }
  );
}
