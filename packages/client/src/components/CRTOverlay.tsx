type CRTOverlayProps = {
  className?: string;
};

export default function CRTOverlay({ className = "" }: CRTOverlayProps) {
  return <div className={`crt-overlay${className ? ` ${className}` : ""}`} aria-hidden="true" />;
}
