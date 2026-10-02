import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeRendererProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}

export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  value,
  width = 1.5,
  height = 40,
  displayValue = true,
  fontSize = 12,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: width,
        height: height,
        displayValue: displayValue,
        fontSize: fontSize,
        font: 'JetBrains Mono',
        textMargin: 2,
        margin: 4,
        background: 'transparent',
        lineColor: '#000000',
      });
    } catch {
      // Fallback if code128 has unsupported characters
      try {
        JsBarcode(svgRef.current, value.replace(/[^\x00-\x7F]/g, '0'), {
          width: width,
          height: height,
          displayValue: displayValue,
        });
      } catch {
        // silently handle
      }
    }
  }, [value, width, height, displayValue, fontSize]);

  return <svg ref={svgRef} className={`inline-block ${className}`} />;
};
