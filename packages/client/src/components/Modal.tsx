import { useEffect } from "react";

type ModalChoice = {
  id: string;
  label: string;
  hint?: string;
  tone?: "primary" | "danger" | "neutral";
};

type ModalProps = {
  isOpen: boolean;
  imageSrc: string;
  imageAlt: string;
  label: string;
  sublabel?: string;
  dividerLabel?: string;
  body: string[];
  choices: ModalChoice[];
  onClose: () => void;
  onChoice?: (choice: ModalChoice) => void;
  closeOnOverlayClick?: boolean;
};

export default function Modal({
  isOpen,
  imageSrc,
  imageAlt,
  label,
  sublabel,
  dividerLabel,
  body,
  choices,
  onClose,
  onChoice,
  closeOnOverlayClick = true,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={closeOnOverlayClick ? onClose : undefined}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="modal-corner modal-corner--tl" aria-hidden="true" />
        <span className="modal-corner modal-corner--tr" aria-hidden="true" />
        <span className="modal-corner modal-corner--bl" aria-hidden="true" />
        <span className="modal-corner modal-corner--br" aria-hidden="true" />

        <button className="modal-close" type="button" onClick={onClose} aria-label="모달 닫기">
          [x]
        </button>

        <div className="modal-frame modal-frame--top" aria-hidden="true" />

        <div className="modal-header">
          <div className="modal-image-wrap">
            <img className="modal-image" src={imageSrc} alt={imageAlt} />
          </div>

          <div id="modal-title" className="modal-label">{label}</div>
          {sublabel && <div className="modal-sublabel">{sublabel}</div>}
        </div>

        {dividerLabel && (
          <div className="modal-divider" aria-hidden="true">
            <span>{dividerLabel}</span>
          </div>
        )}

        <div className="modal-body">
          {body.map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
          ))}
        </div>

        <div className="modal-choices">
          {choices.map((choice) => (
            <button
              key={choice.id}
              className={`modal-choice modal-choice--${choice.tone ?? "neutral"}`}
              type="button"
              onClick={() => onChoice?.(choice)}
            >
              <span className="modal-choice-label">{choice.label}</span>
              {choice.hint && <span className="modal-choice-hint">{choice.hint}</span>}
            </button>
          ))}
        </div>

        <div className="modal-frame modal-frame--bottom" aria-hidden="true" />
      </div>
    </div>
  );
}
