import { iconPaths, type IconName } from "./icon-paths"

interface IconProps {
  name: IconName

  size?: number

  strokeWidth?: number
}

export default function Icon({
  name,

  size = 18,

  strokeWidth = 1.8,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name].map((shape, index) => {
        if (shape.type === "path") {
          return <path d={shape.d} key={index} />
        }

        if (shape.type === "circle") {
          return <circle cx={shape.cx} cy={shape.cy} r={shape.r} key={index} />
        }

        return (
          <rect
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            rx={shape.rx}
            key={index}
          />
        )
      })}
    </svg>
  )
}

export type { IconName }
