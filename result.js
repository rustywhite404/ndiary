const list = document.getElementById('sentenceList');
const raw = sessionStorage.getItem('ndiary_result');

if (!raw) {
  window.location.href = 'index.html';
} else {
  const sentences = JSON.parse(raw);

  sentences.forEach((s, i) => {
    const card = document.createElement('div');
    card.className = 'sentence-card';
    card.style.animationDelay = `${i * 0.08}s`;

    card.innerHTML = `
      <div class="sentence-num">${i + 1}</div>

      <div class="correction-area">
        <div class="area-label">
          <div class="area-dot area-dot--grammar"></div>
          <span>文法チェック</span>
        </div>

        <div class="sentence-row sentence-row--original">
          <span class="row-tag">원문</span>
          <span class="row-text">${escapeHtml(s.original)}</span>
        </div>

        <div class="sentence-row sentence-row--corrected">
          <span class="row-tag row-tag--fix">교정</span>
          <span class="row-text">${highlight(s.corrected, 'fix')}</span>
        </div>

        <div class="sentence-note">${escapeHtml(s.explanation)}</div>
      </div>

      <div class="correction-area">
        <div class="area-label">
          <div class="area-dot area-dot--natural"></div>
          <span>自然な表現</span>
        </div>

        <div class="sentence-row sentence-row--natural">
          <span class="row-tag row-tag--natural">자연</span>
          <span class="row-text">${highlight(s.natural, 'natural')}</span>
        </div>

        <div class="sentence-note">${escapeHtml(s.natural_explanation)}</div>
      </div>
    `;

    list.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function highlight(str, type) {
  const escaped = escapeHtml(str);
  return escaped.replace(/\*\*(.+?)\*\*/g, `<span class="hl hl--${type}">$1</span>`);
}
