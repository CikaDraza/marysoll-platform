export default function EyebrowsIcon({
  bgColor = "#ffffff",
  width = 132,
  height = 132,
  stroke = 2,
  hasCircle = true,
}: {
  bgColor?: string;
  width?: number;
  height?: number;
  stroke?: number;
  hasCircle?: boolean;
}) {
  return (
    <div>
      <svg
        width={width}
        height={height}
        viewBox="0 0 132 132"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {hasCircle && (
          <circle
            cx="66"
            cy="66"
            r="65"
            stroke={bgColor}
            strokeWidth={stroke}
          />
        )}
        <path
          d="M79.5096 50.7977C94.3644 53.9809 98.6086 59.2862 103.684 61.9313C113.65 61.9313 111.069 61.9313 115.055 61.9313M120.625 56.5656H108.667C92.3895 44.6068 46.8797 28.6627 12 61.5482"
          stroke={bgColor}
          strokeWidth={stroke}
        />
        <path
          d="M59.332 48.9795C71.7037 48.9795 82.3811 51.8003 90.3145 55.7705C98.0843 59.6589 103.059 64.5623 104.603 68.8535C99.6161 79.5933 83.9258 88.835 59.332 88.835C47.0813 88.8349 35.9374 83.71 27.8115 78.5283C23.7566 75.9425 20.4739 73.3556 18.207 71.417C17.0744 70.4484 16.1963 69.6427 15.6035 69.0811C15.54 69.0209 15.4807 68.9617 15.4238 68.9072C15.4807 68.8528 15.5401 68.7945 15.6035 68.7344C16.1964 68.1727 17.0741 67.3663 18.207 66.3975C20.4739 64.4589 23.7566 61.8719 27.8115 59.2861C35.9374 54.1045 47.0814 48.9796 59.332 48.9795Z"
          stroke={bgColor}
          strokeWidth={stroke}
        />
        <circle
          cx="59.8348"
          cy="67.9105"
          r="8.96564"
          stroke={bgColor}
          strokeWidth={stroke}
        />
        <circle cx="66.5" cy="67.5" r="2.5" fill="black" />
        <circle
          cx="59.8336"
          cy="67.9108"
          r="18.9313"
          stroke={bgColor}
          strokeWidth={stroke}
        />
      </svg>
    </div>
  );
}
