import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathBlockProps {
  math: string;
  block?: boolean;
}

export function MathBlock({ math, block = false }: MathBlockProps) {
  const containerRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: block,
          throwOnError: false,
          output: 'html',
          strict: false,
        });
      } catch (err) {
        console.error('KaTeX error:', err);
      }
    }
  }, [math, block]);

  return <span ref={containerRef} />;
}
