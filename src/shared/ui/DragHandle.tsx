import { GripVertical } from "lucide-react";
import type { HTMLAttributes } from "react";

export interface DragHandleProps extends HTMLAttributes<HTMLDivElement> {
  attributes?: Record<string, any>;
  listeners?: Record<string, any> | undefined;
  iconClassName?: string;
}

export function DragHandle({
  attributes,
  listeners,
  className = "",
  iconClassName = "h-4 w-4",
  ...rest
}: DragHandleProps) {
  return (
    <div
      {...attributes}
      {...listeners}
      {...rest}
      className={`inline-flex flex-shrink-0 items-center justify-center text-gray-500 opacity-100 transition-opacity active:cursor-grabbing sm:opacity-0 sm:group-hover:opacity-100 ${className}`}
    >
      <GripVertical className={iconClassName} />
    </div>
  );
}