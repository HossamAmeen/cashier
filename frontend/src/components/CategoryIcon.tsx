import { Icon } from './Icon';
import type { CategoryIconKey } from './categoryIcons';

export type { CategoryIconKey };

interface CategoryIconProps {
  name: string | null | undefined;
  size?: number;
  className?: string;
}

export function CategoryIcon({ name, size = 20, className }: CategoryIconProps) {
  if (!name) {
    return <Icon name="box" size={size} className={className} />;
  }

  // Fallback map to available stroke icons or default box
  return <Icon name="box" size={size} className={className} />;
}
