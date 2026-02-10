const $ = id => document.getElementById(id);

let imageFile = null;
let isLoading = false;

// --- API Key persistence ---
const API_KEY_STORAGE = 'ndiary_apikey';

// --- DOM refs ---
const apiKeyInput = $('apiKey');
const fileInput = $('fileInput');
const uploadEmpty = $('uploadEmpty');
const uploadFilled = $('uploadFilled');
const previewImg = $('previewImg');
const delImgBtn = $('delImg');
const koreanText = $('koreanText');
const charCount = $('charCount');
const submitBtn = $('submitBtn');
const btnText = $('btnText');
const loadingBox = $('loadingBox');
const modalOverlay = $('modalOverlay');
const modalIcon = $('modalIcon');
const modalTitle = $('modalTitle');
const modalBody = $('modalBody');
const modalBtn = $('modalBtn');

// --- Load saved API key ---
const savedKey = localStorage.getItem(API_KEY_STORAGE);
if (savedKey) apiKeyInput.value = savedKey;

apiKeyInput.addEventListener('change', () => {
  const key = apiKeyInput.value.trim();
  if (key) localStorage.setItem(API_KEY_STORAGE, key);
  else localStorage.removeItem(API_KEY_STORAGE);
});

// --- File upload ---
uploadEmpty.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  imageFile = f;
  const reader = new FileReader();
  reader.onload = ev => {
    previewImg.src = ev.target.result;
    uploadEmpty.style.display = 'none';
    uploadFilled.style.display = '';
  };
  reader.readAsDataURL(f);
});

delImgBtn.addEventListener('click', e => {
  e.stopPropagation();
  imageFile = null;
  previewImg.src = '';
  fileInput.value = '';
  uploadEmpty.style.display = '';
  uploadFilled.style.display = 'none';
});

// --- Char count ---
koreanText.addEventListener('input', () => {
  charCount.textContent = koreanText.value.length;
});

// --- Alert Modal ---
function showAlert({ icon = '!', title = 'お知らせ', body, btn = 'わかった' }) {
  modalIcon.textContent = icon;
  modalIcon.className = 'modal-icon';
  modalTitle.textContent = title;
  modalBody.innerHTML = body;
  modalBtn.textContent = btn;
  modalOverlay.style.display = '';
}

function showValidation(messages) {
  showAlert({
    icon: '!',
    title: 'ちょっと待って！',
    body: messages.map(msg =>
      `<div class="modal-item">
        <span class="modal-bullet">${msg.step}</span>
        <span>${msg.text}</span>
      </div>`
    ).join('')
  });
}

const ERROR_PATTERNS = [
  { pattern: /Incorrect API key/i, text: 'API 키를 잘못 입력하셨습니다.' },
  { pattern: /API key not valid/i, text: 'API 키를 잘못 입력하셨습니다.' },
  { pattern: /exceeded.*quota/i, text: 'API 크레딧이 부족합니다. OpenAI 결제 설정을 확인해주세요.' },
  { pattern: /insufficient.*(fund|quota|credit|balance)/i, text: 'API 크레딧이 부족합니다. OpenAI 결제 설정을 확인해주세요.' },
  { pattern: /Rate limit/i, text: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
];

function translateError(msg) {
  const found = ERROR_PATTERNS.find(e => e.pattern.test(msg));
  return found ? found.text : msg;
}

function showErrorAlert(msg) {
  const translated = translateError(msg);
  showAlert({
    icon: '×',
    title: '오류가 발생했습니다.',
    body: `<div class="modal-error-text">${translated}</div>`
  });
}

function hideModal() {
  modalOverlay.style.display = 'none';
}

modalBtn.addEventListener('click', hideModal);
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) hideModal();
});

// --- Loading ---
function setLoading(on) {
  isLoading = on;
  submitBtn.disabled = on;
  btnText.textContent = on ? '添削中…' : '添削する';
  loadingBox.style.display = on ? '' : 'none';
}

// --- Validate ---
function validate() {
  const missing = [];
  if (!apiKeyInput.value.trim()) missing.push({ step: '0', text: 'OpenAI API Key를 입력해주세요.' });
  if (!imageFile) missing.push({ step: '1', text: '손으로 쓴 일기 사진을 업로드해주세요.' });
  if (!koreanText.value.trim()) missing.push({ step: '2', text: '쓰려던 내용을 한국어로 똑같이 작성해주세요.' });
  return missing;
}

// --- Submit ---
submitBtn.addEventListener('click', async () => {
  if (isLoading) return;

  const missing = validate();
  if (missing.length > 0) {
    showValidation(missing);
    return;
  }

  setLoading(true);

  try {
    const b64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });

    const text = koreanText.value;
    const mimeType = imageFile.type || 'image/jpeg';
    const prompt = `あなたは韓国人の初心者に日本語を教える、親切で温かい日本語の先生です。学生が日本語で日記を書く練習をしているので、やさしく丁寧に添削してあげてください。

以下の2つの入力があります：
1. 学生が手書きで書いた日本語の日記の写真
2. 学生がこの日記で書こうとしていた内容の韓国語テキスト

写真から日本語テキストを文単位で読み取り、各文について以下の2段階で添削してください。
また、漢字で書ける部分はできるだけ漢字に直してください（例：きのう→昨日、ともだち→友達）。

【段階1：文法の修正】
- original: 写真から読み取った元の文（そのまま）
- corrected: 文法・語彙・表記の誤りだけを修正した文。修正した箇所を **太字マーカー** で囲む（例：今日は**友達と**遊んだ）
- explanation: 修正箇所について韓国語で詳しく説明する。以下の内容を含めること：
  ① なぜその部分が間違っていたのか、正しい文法ルールは何か
  ② 関連する文法ポイントや覚えておくと役立つ知識（例：似ている表現との違い、よくある間違いパターンなど）
  ③ 初心者が間違えやすいポイントへの注意やアドバイス
  日本語の単語や表現を引用する時は「」で囲んでそのまま日本語で表記する。
  例：「ひとりだった」는 「ひとりでいた」로 쓰는 게 자연스럽습니다. 「いる」는 사람이나 동물이 존재할 때 쓰는 동사예요. 비슷한 표현으로 「一人きりだった」도 있는데, 이건 '혼자뿐이었다'라는 뉘앙스가 강해요.

【段階2：より自然な表現】
- natural: ネイティブが日常的に使う簡潔で自然な表現に書き換えた文。元の文から変わった箇所を **太字マーカー** で囲む
- natural_explanation: なぜこの表現がより自然なのか韓国語で詳しく説明する。以下の内容を含めること：
  ① 元の表現と自然な表現の違いは何か（ニュアンス、使用場面の違い）
  ② 日本人がどんな場面でこの表現を使うのか
  ③ 日記や日常会話で使える関連表現があれば紹介する
  日本語を引用する時は「」で囲む。
  例：일본어에서는 하루의 감상을 말할 때 「〜な一日だった」라는 표현을 자주 써요. 「楽しい一日だった」「忙しい一日だった」처럼 그날의 느낌을 한마디로 정리하는 느낌이에요.

韓国語テキスト：${text}

以下のJSON形式で回答してください：
{"sentences":[{"original":"元の文","corrected":"**修正箇所**を含む修正文","explanation":"한국어 상세 설명","natural":"**변경부분**을 포함한 자연스러운 표현","natural_explanation":"한국어 상세 설명"}]}`;

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeyInput.value.trim()}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a JSON-only responder. Always respond with valid JSON and nothing else.' },
          { role: 'user', content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${b64}` } },
            { type: 'text', text: prompt }
          ]}
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 4096
      })
    });

    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}));
      throw new Error(e?.error?.message || `Error ${resp.status}`);
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content || '';
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('응답 파싱 실패');
      result = JSON.parse(match[0]);
    }

    if (!result.sentences || !result.sentences.length) throw new Error('응답 파싱 실패');

    sessionStorage.setItem('ndiary_result', JSON.stringify(result.sentences));
    window.location.href = 'result.html';

  } catch (e) {
    showErrorAlert(e.message);
  } finally {
    setLoading(false);
  }
});
