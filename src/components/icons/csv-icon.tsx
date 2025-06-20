// src/components/icons/csv-icon.tsx
import { cn } from "@/lib/utils";

interface CsvIconProps extends React.SVGProps<SVGSVGElement> {
  iconClassName?: string;
}

export function CsvIcon({ iconClassName, ...props }: CsvIconProps) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-5 h-5", iconClassName)} // Default size, can be overridden
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1 1.5C1 0.671573 1.67157 0 2.5 0H10.7071L14 3.29289V13.5C14 14.3284 13.3284 15 12.5 15H2.5C1.67157 15 1 14.3284 1 13.5V1.5ZM2 6H5V7H3V10H5V11H2V6ZM9 6H6V9H8V10H6V11H9V8H7V7H9V6ZM11 6H10V9.70711L11.5 11.2071L13 9.70711V6H12V9.29289L11.5 9.79289L11 9.29289V6Z"
        fill="currentColor" // Changed fill to currentColor to respect parent text color
      />
    </svg>
  );
}