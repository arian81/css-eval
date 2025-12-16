import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

interface IframePreviewProps {
  htmlContent: string;
  className?: string;
}

export interface IframePreviewHandle {
  getIframe: () => HTMLIFrameElement | null;
}

export const IframePreview = forwardRef<
  IframePreviewHandle,
  IframePreviewProps
>(function IframePreview({ htmlContent, className }, ref) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const contentRef = useRef<string>("");

  useImperativeHandle(ref, () => ({
    getIframe: () => iframeRef.current,
  }));

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Skip if content hasn't changed
    if (contentRef.current === htmlContent) return;
    contentRef.current = htmlContent;

    const doc = iframe.contentDocument;
    if (!doc) return;

    // Write content directly to iframe document for instant sync
    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`);
    doc.close();
  }, [htmlContent]);

  return (
    <iframe
      ref={iframeRef}
      className={className}
      sandbox="allow-same-origin"
      title="Preview"
      style={{ border: "none" }}
    />
  );
});
