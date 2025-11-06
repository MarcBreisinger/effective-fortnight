declare module "*.png" {
  const src: string;
  export default src;
}

export interface Animal { name: string; src: string; }
export const animals: Animal[];
export const registry: Record<string, string>;

export interface AnimalAvatarProps {
  name: string;
  size?: number;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}
export function AnimalAvatar(props: AnimalAvatarProps): JSX.Element | null;
