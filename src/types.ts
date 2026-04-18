/**
 * QR Code configuration types based on qr-code-styling library
 */

export type DotType = 'dots' | 'rounded' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded';
export type CornerSquareType = 'dot' | 'square' | 'extra-rounded';
export type CornerDotType = 'dot' | 'square';
export type DrawType = 'canvas' | 'svg';
export type GradientType = 'linear' | 'radial';
export type FileExtension = 'png' | 'jpeg' | 'webp' | 'svg' | 'pdf';

export interface Gradient {
  type: GradientType;
  rotation?: number;
  colorStops: { offset: number; color: string }[];
}

export interface QRConfig {
  width: number;
  height: number;
  data: string;
  margin: number;
  qrOptions: {
    typeNumber: number;
    mode: 'Numeric' | 'Alphanumeric' | 'Byte' | 'Kanji';
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  };
  imageOptions: {
    hideBackgroundDots: boolean;
    imageSize: number;
    margin: number;
    crossOrigin?: string;
  };
  dotsOptions: {
    type: DotType;
    color: string;
    gradient?: Gradient;
  };
  backgroundOptions: {
    color: string;
    gradient?: Gradient;
  };
  cornersSquareOptions: {
    type: CornerSquareType;
    color: string;
    gradient?: Gradient;
  };
  cornersDotOptions: {
    type: CornerDotType;
    color: string;
    gradient?: Gradient;
  };
  image?: string;
}

export const DEFAULT_CONFIG: QRConfig = {
  width: 300,
  height: 300,
  data: 'https://qr-code-styling.com',
  margin: 10,
  qrOptions: {
    typeNumber: 0,
    mode: 'Byte',
    errorCorrectionLevel: 'Q',
  },
  imageOptions: {
    hideBackgroundDots: true,
    imageSize: 0.4,
    margin: 5,
  },
  dotsOptions: {
    type: 'square',
    color: '#000000',
  },
  backgroundOptions: {
    color: '#ffffff',
  },
  cornersSquareOptions: {
    type: 'square',
    color: '#000000',
  },
  cornersDotOptions: {
    type: 'square',
    color: '#000000',
  },
};
