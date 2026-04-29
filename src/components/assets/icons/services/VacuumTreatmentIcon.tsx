type IconProps = {
  bgColor?: string;
  width?: number;
  height?: number;
  stroke?: number;
  hasCircle?: boolean;
};

// 3. Vacuum Treatment Icon (Vakuum tretman)
export const VacuumTreatmentIcon = ({
  bgColor = "#000000",
  width = 132,
  height = 132,
  stroke = 2,
  hasCircle = true,
}: IconProps) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 132 132"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {hasCircle && (
      <circle cx="66" cy="66" r="65" stroke={bgColor} strokeWidth={stroke} />
    )}
    <path
      d="M45 74h42c2 0 4-2 4-4V45c0-10-8-18-18-18s-18 8-18 18v25c0 2 2 4 4 4z"
      stroke={bgColor}
      strokeWidth={stroke}
    />
    <path
      d="M42 74v2h48v-2"
      stroke={bgColor}
      strokeWidth={stroke}
      strokeLinecap="round"
    />
    <path
      d="M30 85h15c0 0 5 10 21 10s21-10 21-10h15"
      stroke={bgColor}
      strokeWidth={stroke}
      strokeLinecap="round"
    />
  </svg>
);
