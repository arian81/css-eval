import { useEffect, useRef } from "react";

interface IsolatedContentProps {
  htmlContent: string;
  className?: string;
}

export function IsolatedContent({ htmlContent, className }: IsolatedContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!containerRef.current.shadowRoot) {
      containerRef.current.attachShadow({ mode: "open" });
    }

    if (containerRef.current.shadowRoot) {
      containerRef.current.shadowRoot.innerHTML = htmlContent;
    }
  }, [htmlContent]);

  return <div ref={containerRef} className={className} />;
}

