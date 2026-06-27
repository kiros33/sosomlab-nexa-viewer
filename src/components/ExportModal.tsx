/** 내보내기 모달 — 큰 이미지로 PDF / HTML 선택. */
import { FormatBadge } from "./FormatBadge";
import { Icon } from "./Icon";

export function ExportModal({
  onClose,
  onHtml,
  onPdf,
}: {
  onClose: () => void;
  onHtml: () => void;
  onPdf: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>내보내기</b>
          <button className="modal-close" onClick={onClose} title="닫기">
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="pref-desc">내보낼 형식을 선택하세요.</p>
        <div className="export-choices">
          <button
            className="export-card"
            onClick={() => {
              onHtml();
              onClose();
            }}
          >
            <FormatBadge label="HTML" size={76} />
            <div className="export-card-title">HTML</div>
            <div className="export-card-desc">스타일 포함 단일 .html 파일</div>
          </button>
          <button
            className="export-card"
            onClick={() => {
              onPdf();
              onClose();
            }}
          >
            <FormatBadge label="PDF" size={76} />
            <div className="export-card-title">PDF</div>
            <div className="export-card-desc">인쇄 → "PDF로 저장"</div>
          </button>
        </div>
      </div>
    </div>
  );
}
