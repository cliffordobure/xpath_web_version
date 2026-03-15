import { Box } from '@mui/material';
import logoUrl from '../assets/logo_large.png';

interface LogoProps {
  /** Max height in px or theme string (e.g. 32, 40, '28px'). Default 40. */
  height?: number | string;
  /** Optional max width. */
  width?: number | string;
  /** Use when logo is on dark background (e.g. invert or brighten). */
  variant?: 'default' | 'light';
  sx?: object;
}

export function Logo({ height = 40, width, variant = 'default', sx = {} }: LogoProps) {
  return (
    <Box
      component="img"
      src={logoUrl}
      alt="X-PATH LIMS"
      sx={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: width ? (typeof width === 'number' ? `${width}px` : width) : 'auto',
        maxHeight: '100%',
        objectFit: 'contain',
        ...(variant === 'light' && { filter: 'brightness(0) invert(1)' }),
        ...sx,
      }}
    />
  );
}
