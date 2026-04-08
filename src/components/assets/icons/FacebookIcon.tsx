export default function FacebookIcon({
  bgColor = "#5D0156",
  width = 20,
  height = 20,
}: {
  bgColor?: string;
  width?: number;
  height?: number;
}) {
  return (
    <div>
      <svg
        width={width}
        height={height}
        viewBox="0 0 21 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20.1161 10C20.1161 4.48 15.6101 0 10.058 0C4.506 0 0 4.48 0 10C0 14.84 3.45997 18.87 8.04643 19.8V13H6.03483V10H8.04643V7.5C8.04643 5.57 9.62555 4 11.5667 4H14.0813V7H12.0697C11.5165 7 11.0638 7.45 11.0638 8V10H14.0813V13H11.0638V19.95C16.1432 19.45 20.1161 15.19 20.1161 10Z"
          fill={bgColor}
        />
      </svg>
    </div>
  );
}
