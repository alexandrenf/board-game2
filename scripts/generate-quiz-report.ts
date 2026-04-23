import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import boardDefinition from '../assets/board.json';
import {
  QUIZ_QUESTIONS,
  QUIZ_SOURCES,
  QUIZ_THEMES,
  type QuizQuestion,
  type QuizTheme,
} from '../src/content/quizQuestions';

type BoardTileRecord = {
  id: number;
  type?: string;
  color?: string;
  text?: string;
  meta?: {
    label?: string;
    themeId?: string;
    themeTitle?: string;
    themeCategory?: string;
  };
};

type EligibleTile = {
  id: number;
  color: QuizTheme;
  label: string;
  themeId: string;
  themeTitle?: string;
  themeCategory?: string;
};

const THEME_ORDER: QuizTheme[] = ['red', 'green', 'blue', 'yellow'];

const THEME_ACCENTS: Record<QuizTheme, { bg: string; border: string; ink: string }> = {
  red: { bg: '#ffe1e1', border: '#d93025', ink: '#7f1d1d' },
  green: { bg: '#dcfce7', border: '#15803d', ink: '#14532d' },
  blue: { bg: '#dbeafe', border: '#2563eb', ink: '#1e3a8a' },
  yellow: { bg: '#fef3c7', border: '#d97706', ink: '#78350f' },
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'reports');
const htmlOutputPath = path.join(outputDir, 'relatorio-perguntas-casas-quiz.html');
const pdfOutputPath = path.join(outputDir, 'relatorio-perguntas-casas-quiz.pdf');

const boardTiles = boardDefinition.tiles as readonly BoardTileRecord[];

const eligibleTiles = boardTiles
  .filter((tile): tile is BoardTileRecord & { color: QuizTheme; meta: NonNullable<BoardTileRecord['meta']> } => {
    if (tile.type === 'start' || tile.type === 'end' || tile.type === 'bonus') return false;
    if (!tile.color || !Object.hasOwn(QUIZ_THEMES, tile.color)) return false;
    if (!tile.meta?.themeId) return false;
    return true;
  })
  .map<EligibleTile>((tile) => ({
    id: tile.id,
    color: tile.color,
    label: tile.meta.label?.trim() || tile.text?.trim() || `Casa ${tile.id}`,
    themeId: tile.meta.themeId!,
    themeTitle: tile.meta.themeTitle,
    themeCategory: tile.meta.themeCategory,
  }))
  .sort((a, b) => a.id - b.id);

const eligibleTilesByColor = THEME_ORDER.reduce<Record<QuizTheme, EligibleTile[]>>(
  (accumulator, theme) => {
    accumulator[theme] = eligibleTiles.filter((tile) => tile.color === theme);
    return accumulator;
  },
  { red: [], green: [], blue: [], yellow: [] }
);

const questionsByTheme = THEME_ORDER.reduce<Record<QuizTheme, QuizQuestion[]>>(
  (accumulator, theme) => {
    accumulator[theme] = QUIZ_QUESTIONS.filter((question) => question.theme === theme);
    return accumulator;
  },
  { red: [], green: [], blue: [], yellow: [] }
);

const totalReachableQuestions = QUIZ_QUESTIONS.filter(
  (question) => eligibleTilesByColor[question.theme].length > 0
).length;

const totalUnreachableQuestions = QUIZ_QUESTIONS.length - totalReachableQuestions;

const generationDate = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Fortaleza',
}).format(new Date());

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const themeLabel = (theme: QuizTheme) => QUIZ_THEMES[theme].label;

const renderThemeSummaryCard = (theme: QuizTheme): string => {
  const questions = questionsByTheme[theme];
  const tiles = eligibleTilesByColor[theme];
  const accent = THEME_ACCENTS[theme];

  return `
    <article class="theme-card" style="--theme-bg:${accent.bg};--theme-border:${accent.border};--theme-ink:${accent.ink};">
      <div class="theme-card__eyebrow">${escapeHtml(theme.toUpperCase())}</div>
      <h3>${escapeHtml(themeLabel(theme))}</h3>
      <p>${escapeHtml(QUIZ_THEMES[theme].description)}</p>
      <dl class="theme-card__stats">
        <div>
          <dt>Perguntas</dt>
          <dd>${questions.length}</dd>
        </div>
        <div>
          <dt>Casas elegíveis</dt>
          <dd>${tiles.length}</dd>
        </div>
      </dl>
    </article>
  `;
};

const renderTileList = (tiles: EligibleTile[]): string => {
  if (tiles.length === 0) {
    return '<p class="empty-note">Nenhuma casa de quiz elegível no tabuleiro atual.</p>';
  }

  return `
    <ul class="tile-list">
      ${tiles
        .map(
          (tile) => `
            <li>
              <strong>Casa ${tile.id}</strong>
              <span>${escapeHtml(tile.label)}</span>
              <small>${escapeHtml(tile.themeTitle ?? 'Sem tema descritivo adicional')}</small>
            </li>
          `
        )
        .join('')}
    </ul>
  `;
};

const renderSourceList = (question: QuizQuestion): string => `
  <ul class="source-list">
    ${question.sourceIds
      .map((sourceId) => {
        const source = QUIZ_SOURCES[sourceId];
        return `
          <li>
            <a href="${escapeHtml(source.url)}">${escapeHtml(source.title)}</a>
            <span>${escapeHtml(source.url)}</span>
          </li>
        `;
      })
      .join('')}
  </ul>
`;

const renderOptions = (question: QuizQuestion): string => {
  const optionLabels = ['A', 'B', 'C', 'D'] as const;

  return `
    <ol class="options-list">
      ${question.options
        .map((option, index) => {
          const isCorrect = index === question.correctOptionIndex;
          return `
            <li class="${isCorrect ? 'is-correct' : ''}">
              <span class="option-letter">${optionLabels[index]}</span>
              <span>${escapeHtml(option)}</span>
            </li>
          `;
        })
        .join('')}
    </ol>
  `;
};

const renderQuestionCard = (question: QuizQuestion): string => {
  const themeTiles = eligibleTilesByColor[question.theme];
  const accent = THEME_ACCENTS[question.theme];

  const tileSummary =
    themeTiles.length > 0
      ? `Pode aparecer em qualquer uma das ${themeTiles.length} casas elegíveis deste tema/cor: ${themeTiles
          .map((tile) => `Casa ${tile.id}`)
          .join(', ')}.`
      : 'Não possui casa elegível no tabuleiro atual; esta pergunta está cadastrada, mas não aparece em jogo.';

  return `
    <article class="question-card" style="--theme-bg:${accent.bg};--theme-border:${accent.border};--theme-ink:${accent.ink};">
      <div class="question-card__meta">
        <span class="pill">${escapeHtml(question.id)}</span>
        <span class="pill">${escapeHtml(themeLabel(question.theme))}</span>
      </div>
      <h4>${escapeHtml(question.prompt)}</h4>
      <section>
        <h5>Alternativas</h5>
        ${renderOptions(question)}
      </section>
      <section>
        <h5>Casas em que pode aparecer</h5>
        <p>${escapeHtml(tileSummary)}</p>
      </section>
      <section>
        <h5>Explicação</h5>
        <p>${escapeHtml(question.explanation)}</p>
      </section>
      <section>
        <h5>Fontes desta pergunta</h5>
        ${renderSourceList(question)}
      </section>
    </article>
  `;
};

const renderThemeSection = (theme: QuizTheme): string => {
  const questions = questionsByTheme[theme];
  const tiles = eligibleTilesByColor[theme];
  const accent = THEME_ACCENTS[theme];

  return `
    <section class="theme-section">
      <header class="theme-section__header" style="--theme-bg:${accent.bg};--theme-border:${accent.border};--theme-ink:${accent.ink};">
        <div>
          <div class="section-kicker">${escapeHtml(theme.toUpperCase())}</div>
          <h2>${escapeHtml(themeLabel(theme))}</h2>
          <p>${escapeHtml(QUIZ_THEMES[theme].description)}</p>
        </div>
        <div class="section-badge">${questions.length} perguntas</div>
      </header>

      <section class="subsection">
        <h3>Casas elegíveis deste tema/cor</h3>
        <p class="method-note">
          No código atual, a seleção da pergunta usa a <strong>cor da casa</strong>, então qualquer pergunta desta seção
          pode aparecer em qualquer casa elegível listada abaixo.
        </p>
        ${renderTileList(tiles)}
      </section>

      <section class="subsection">
        <h3>Perguntas</h3>
        <div class="question-grid">
          ${questions.map((question) => renderQuestionCard(question)).join('')}
        </div>
      </section>
    </section>
  `;
};

const uniqueSourceIds = [...new Set(QUIZ_QUESTIONS.flatMap((question) => question.sourceIds))];

const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Relatório de perguntas e casas de quiz</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #1f2937;
        --muted: #6b7280;
        --line: #d1d5db;
        --paper: #f8fafc;
        --card: #ffffff;
        --cover: linear-gradient(135deg, #0f172a 0%, #1d4ed8 48%, #16a34a 100%);
      }

      * { box-sizing: border-box; }
      html { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 12px; }
      body {
        margin: 0;
        color: var(--ink);
        background: var(--paper);
        line-height: 1.5;
      }

      main { padding: 24px; }

      h1, h2, h3, h4, h5, p, ul, ol, dl { margin: 0; }
      a { color: #1d4ed8; text-decoration: none; }
      strong { font-weight: 700; }

      .cover {
        color: white;
        background: var(--cover);
        border-radius: 20px;
        padding: 32px;
        margin-bottom: 24px;
      }

      .cover__eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 10px;
        opacity: 0.85;
        margin-bottom: 12px;
      }

      .cover h1 {
        font-size: 28px;
        line-height: 1.15;
        margin-bottom: 12px;
      }

      .cover p {
        max-width: 78ch;
        font-size: 14px;
      }

      .cover__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 18px;
      }

      .meta-pill, .pill {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.02em;
        border: 1px solid rgba(255,255,255,0.25);
        background: rgba(255,255,255,0.12);
      }

      .section {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 20px;
        margin-bottom: 20px;
      }

      .section h2 {
        font-size: 20px;
        margin-bottom: 10px;
      }

      .section p + p,
      .section p + ul,
      .section p + ol,
      .section p + .summary-grid,
      .section h2 + .summary-grid {
        margin-top: 12px;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .theme-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 14px;
      }

      .theme-card {
        border: 1px solid var(--theme-border);
        background: var(--theme-bg);
        color: var(--theme-ink);
        border-radius: 16px;
        padding: 16px;
      }

      .theme-card__eyebrow {
        font-size: 10px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        opacity: 0.85;
        margin-bottom: 8px;
      }

      .theme-card h3 {
        font-size: 18px;
        margin-bottom: 6px;
      }

      .theme-card__stats {
        display: flex;
        gap: 16px;
        margin-top: 14px;
      }

      .theme-card__stats dt {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        opacity: 0.8;
      }

      .theme-card__stats dd {
        font-size: 24px;
        font-weight: 800;
      }

      .theme-section {
        margin-top: 28px;
        page-break-before: always;
      }

      .theme-section:first-of-type {
        page-break-before: auto;
      }

      .theme-section__header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 20px;
        border-radius: 18px;
        border: 1px solid var(--theme-border);
        background: var(--theme-bg);
        color: var(--theme-ink);
      }

      .theme-section__header h2 {
        font-size: 24px;
        margin-top: 4px;
        margin-bottom: 8px;
      }

      .section-kicker {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        opacity: 0.8;
      }

      .section-badge {
        height: fit-content;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.55);
        border: 1px solid rgba(0, 0, 0, 0.08);
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
      }

      .subsection {
        margin-top: 16px;
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 18px;
      }

      .subsection h3 {
        font-size: 18px;
        margin-bottom: 10px;
      }

      .method-note {
        color: var(--muted);
      }

      .tile-list {
        list-style: none;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 14px;
      }

      .tile-list li {
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 12px;
        background: #fbfdff;
      }

      .tile-list strong,
      .tile-list span,
      .tile-list small {
        display: block;
      }

      .tile-list small {
        color: var(--muted);
        margin-top: 6px;
      }

      .empty-note {
        padding: 14px;
        border-radius: 14px;
        background: #fff7ed;
        border: 1px solid #fed7aa;
        color: #9a3412;
      }

      .question-grid {
        display: grid;
        gap: 14px;
      }

      .question-card {
        border: 1px solid var(--theme-border);
        border-radius: 16px;
        padding: 16px;
        background:
          linear-gradient(180deg, color-mix(in srgb, var(--theme-bg) 60%, white 40%) 0%, white 18%),
          white;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .question-card__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 10px;
      }

      .question-card .pill {
        background: white;
        border-color: var(--theme-border);
        color: var(--theme-ink);
      }

      .question-card h4 {
        font-size: 16px;
        line-height: 1.35;
        margin-bottom: 14px;
      }

      .question-card section + section {
        margin-top: 12px;
      }

      .question-card h5 {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
        margin-bottom: 8px;
      }

      .options-list {
        list-style: none;
        padding: 0;
        display: grid;
        gap: 8px;
      }

      .options-list li {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 10px 12px;
        background: rgba(255,255,255,0.85);
      }

      .options-list li.is-correct {
        border-color: #16a34a;
        background: #ecfdf5;
      }

      .option-letter {
        min-width: 24px;
        height: 24px;
        border-radius: 999px;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        font-size: 11px;
        font-weight: 800;
        background: #e5e7eb;
      }

      .options-list li.is-correct .option-letter {
        background: #16a34a;
        color: white;
      }

      .source-list {
        list-style: none;
        padding: 0;
        display: grid;
        gap: 8px;
      }

      .source-list li {
        border-left: 3px solid #93c5fd;
        padding-left: 10px;
      }

      .source-list a,
      .source-list span {
        display: block;
        word-break: break-word;
      }

      .source-list span {
        color: var(--muted);
        font-size: 11px;
        margin-top: 2px;
      }

      .appendix-list {
        list-style: none;
        padding: 0;
        display: grid;
        gap: 10px;
      }

      .appendix-list li {
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 12px;
        background: #fcfdff;
      }

      .appendix-list a,
      .appendix-list span {
        display: block;
        word-break: break-word;
      }

      .appendix-list span {
        color: var(--muted);
        margin-top: 4px;
      }

      .technical-list {
        padding-left: 18px;
      }

      .technical-list li + li {
        margin-top: 8px;
      }

      @page {
        size: A4;
        margin: 18mm 12mm 18mm 12mm;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="cover">
        <div class="cover__eyebrow">Relatório em português</div>
        <h1>Perguntas do quiz, casas em que podem aparecer e fontes utilizadas</h1>
        <p>
          Este relatório consolida todas as perguntas cadastradas no jogo, as casas do tabuleiro em que elas podem
          aparecer segundo a lógica atual da aplicação e as fontes citadas em cada pergunta.
        </p>
        <div class="cover__meta">
          <span class="meta-pill">Gerado em ${escapeHtml(generationDate)}</span>
          <span class="meta-pill">${QUIZ_QUESTIONS.length} perguntas cadastradas</span>
          <span class="meta-pill">${totalReachableQuestions} perguntas com casas elegíveis</span>
          <span class="meta-pill">${totalUnreachableQuestions} perguntas sem casa elegível</span>
        </div>
      </section>

      <section class="section">
        <h2>Resumo executivo</h2>
        <p>
          O banco autoritativo possui ${QUIZ_QUESTIONS.length} perguntas: ${questionsByTheme.red.length} vermelhas,
          ${questionsByTheme.green.length} verdes, ${questionsByTheme.blue.length} azuis e
          ${questionsByTheme.yellow.length} amarelas.
        </p>
        <p>
          No estado atual do tabuleiro, as perguntas aparecem por <strong>cor da casa</strong>. Assim, toda pergunta
          vermelha pode sair em qualquer casa vermelha elegível; o mesmo vale para verde e azul. As perguntas amarelas
          permanecem no conteúdo, mas não têm casa elegível no tabuleiro atual.
        </p>
        <div class="theme-grid">
          ${THEME_ORDER.map((theme) => renderThemeSummaryCard(theme)).join('')}
        </div>
      </section>

      <section class="section">
        <h2>Metodologia</h2>
        <ul class="technical-list">
          <li>Fonte do conteúdo das perguntas: <strong>src/content/quizQuestions.ts</strong>.</li>
          <li>Fonte do tabuleiro: <strong>assets/board.json</strong>.</li>
          <li>
            Critério de elegibilidade reproduzido do app: casa com cor reconhecida, com <strong>meta.themeId</strong>,
            e que não seja do tipo <strong>start</strong>, <strong>end</strong> ou <strong>bonus</strong>.
          </li>
          <li>
            O vínculo entre pergunta e casa foi calculado pela regra atual de seleção do jogo: a escolha usa a
            <strong>cor da casa</strong>, não o <strong>meta.themeId</strong> individual da casa.
          </li>
        </ul>
      </section>

      ${THEME_ORDER.map((theme) => renderThemeSection(theme)).join('')}

      <section class="section" style="page-break-before: always;">
        <h2>Apêndice: índice único de fontes</h2>
        <ul class="appendix-list">
          ${uniqueSourceIds
            .map((sourceId) => {
              const source = QUIZ_SOURCES[sourceId];
              return `
                <li>
                  <strong>${escapeHtml(source.title)}</strong>
                  <a href="${escapeHtml(source.url)}">${escapeHtml(source.url)}</a>
                </li>
              `;
            })
            .join('')}
        </ul>
      </section>
    </main>
  </body>
</html>`;

mkdirSync(outputDir, { recursive: true });
writeFileSync(htmlOutputPath, html, 'utf8');

const browser = await chromium.launch({ channel: 'chrome', headless: true });

try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.emulateMedia({ media: 'screen' });
  await page.pdf({
    path: pdfOutputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', right: '12mm', bottom: '18mm', left: '12mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="width:100%;font-size:9px;padding:0 12mm;color:#6b7280;text-align:center;">
        Relatório de perguntas e casas do quiz · <span class="pageNumber"></span>/<span class="totalPages"></span>
      </div>
    `,
  });
} finally {
  await browser.close();
}

console.log(`HTML report: ${htmlOutputPath}`);
console.log(`PDF report: ${pdfOutputPath}`);
