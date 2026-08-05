import { ImageResponse } from "next/og";

export const alt = "Dr. GL — GL(백합) 콘텐츠 큐레이션";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * 카카오톡·트위터 등에 링크를 붙였을 때 보이는 대표 이미지.
 * 이미지 생성기에 한글 폰트를 따로 실어야 해서 문구는 로마자로만 쓴다.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0b0a0f 0%, #171226 55%, #241a3a 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 132, fontWeight: 800, letterSpacing: -4 }}>
          <span>Dr.</span>
          <span style={{ color: "#a78bfa" }}>GL</span>
        </div>
        <div style={{ marginTop: 18, fontSize: 38, color: "rgba(255,255,255,0.72)" }}>
          GL · Yuri content curation
        </div>
        <div style={{ marginTop: 40, fontSize: 27, color: "rgba(255,255,255,0.45)" }}>
          Movies · Dramas · Webtoons · Novels — and where to watch them
        </div>
      </div>
    ),
    size,
  );
}
