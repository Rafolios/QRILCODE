import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { QRConfig, FileExtension } from '../types';

interface QRCodeRendererProps {
  config: QRConfig;
}

export interface QRCodeRendererHandle {
  download: (extension: FileExtension) => void;
}

export const QRCodeRenderer = forwardRef<QRCodeRendererHandle, QRCodeRendererProps>(({ config }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling>(new QRCodeStyling({
    ...config,
    type: 'svg'
  }));

  useImperativeHandle(ref, () => ({
    download: (extension: FileExtension) => {
      qrCode.current.download({ name: 'qr-code', extension });
    }
  }));

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      qrCode.current.append(containerRef.current);
    }
  }, []);

  useEffect(() => {
    qrCode.current.update({
      ...config,
      type: 'svg'
    });
  }, [config]);

  return (
    <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-white rounded-[24px] shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden relative group max-w-full">
      <div 
        ref={containerRef} 
        className="transition-all duration-500 ease-out transform group-hover:scale-[1.03] max-w-full [&>svg]:max-w-full [&>svg]:h-auto" 
      />
    </div>
  );
});

QRCodeRenderer.displayName = 'QRCodeRenderer';
