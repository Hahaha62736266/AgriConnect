import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'text-sm' | 'text-lg' | 'title' | 'circular' | 'rectangular' | 'rounded' | 'pill';
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  count?: number;
  className?: string;
  style?: React.CSSProperties;
  inline?: boolean;
}

/**
 * Accessible, customizable Skeleton placeholder primitive.
 * Animates with warm shimmer gradient matching AgriConnect's design tokens.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  borderRadius,
  count = 1,
  className = '',
  style = {},
  inline = false,
  ...rest
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'text-sm':
        return 'skeleton skeleton-text skeleton-text-sm';
      case 'text-lg':
        return 'skeleton skeleton-text skeleton-text-lg';
      case 'title':
        return 'skeleton skeleton-title';
      case 'circular':
        return 'skeleton skeleton-circular';
      case 'rectangular':
        return 'skeleton';
      case 'rounded':
        return 'skeleton skeleton-rounded';
      case 'pill':
        return 'skeleton skeleton-pill';
      case 'text':
      default:
        return 'skeleton skeleton-text';
    }
  };

  const customStyle: React.CSSProperties = {
    ...style,
    ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
    ...(borderRadius !== undefined ? { borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius } : {}),
    ...(inline ? { display: 'inline-block' } : {}),
  };

  const variantClass = getVariantClass();
  const fullClassName = `${variantClass} ${className}`.trim();

  if (count <= 1) {
    return (
      <div
        className={fullClassName}
        style={customStyle}
        aria-hidden="true"
        {...rest}
      />
    );
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={fullClassName}
          style={customStyle}
          aria-hidden="true"
          {...rest}
        />
      ))}
    </>
  );
};

export default Skeleton;
