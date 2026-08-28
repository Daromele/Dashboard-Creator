import { QuizQuestion, GroundingChunk } from '../types';
import { synthesizeStinger } from '../utils/audio';

/**
 * Every AI feature in this app goes through the app's own `/api/claude`
 * endpoint, which calls Claude server-side so the API key never reaches the
 * browser. See `server.ts`.
 */
interface ClaudeCallOptions {
  system?: string;
  prompt: string;
  schema?: Record<string, unknown>;
  useWebSearch?: boolean;
  maxTokens?: number;
}

interface ClaudeCallResult {
  text: string;
  sources: { uri: string; title: string }[];
}

async function callClaude(options: ClaudeCallOptions): Promise<ClaudeCallResult> {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  const data = await response.json();
  return { text: data.text ?? '', sources: data.sources ?? [] };
}

/**
 * Parses a JSON payload that may be wrapped in markdown fences or trailing prose.
 * Structured outputs make this unnecessary, but web-search responses are free-form.
 */
function parseJson(raw: string): any {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  let candidate = fenced ? fenced[1] : trimmed;

  if (!fenced) {
    // Fall back to the outermost array/object in the response.
    const start = candidate.search(/[[{]/);
    const end = Math.max(candidate.lastIndexOf(']'), candidate.lastIndexOf('}'));
    if (start !== -1 && end > start) candidate = candidate.slice(start, end + 1);
  }

  try {
    return JSON.parse(candidate);
  } catch (error) {
    console.error('Failed to parse JSON from Claude:', { raw, candidate });
    throw new Error(`Claude returned a response that was not valid JSON: ${candidate.slice(0, 120)}...`);
  }
}

/** Calls Claude and parses the result as JSON, whether or not a schema was used. */
async function callClaudeForJson(options: ClaudeCallOptions): Promise<{ json: any; sources: GroundingChunk[] }> {
  const { text, sources } = await callClaude(options);
  return {
    json: parseJson(text),
    sources: sources.map((source) => ({ web: source })),
  };
}

export async function generateQuizFromTopic(
  topic: string,
  audience: string = 'Default',
  difficulty: string = 'Default',
  quizType: string = 'Multiple Choice',
  numQuestions: number = 3,
  isSeasonal: boolean = false,
  season: string = '',
  useWebSearch: boolean = false,
): Promise<{ questions: Partial<QuizQuestion>[], sources?: GroundingChunk[] }> {

  let questionFormatInstruction: string;
  let optionCount = 4;

  switch (quizType) {
    case 'Emoji':
      questionFormatInstruction = "- The 'question' field MUST consist ONLY of emojis.";
      break;
    case 'True/False':
      questionFormatInstruction = "- The 'question' field should be a statement.";
      optionCount = 2;
      break;
    case 'This or That':
      questionFormatInstruction = "- The 'question' field should present a clear choice FOR THE VIEWER, phrased like 'Which do you prefer?', 'Would you rather...?', etc.";
      optionCount = 2;
      break;
    default:
      questionFormatInstruction = '- Questions should be short text.';
      break;
  }

  const isThisOrThat = quizType === 'This or That';

  const seasonalInstruction = isSeasonal && season
    ? `- The questions MUST be themed around the current season: ${season}, but still focus on the main topic.`
    : '';

  const searchInstruction = useWebSearch
    ? '- Use web search to make sure the questions are factually accurate and up to date.'
    : '- Your goal is to generate factually accurate and engaging questions.';

  const optionSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      question: { type: 'string' },
      options: { type: 'array', items: { type: 'string' }, minItems: optionCount, maxItems: optionCount },
      correctAnswerIndex: isThisOrThat
        ? { type: 'null' }
        : { type: 'integer', minimum: 0, maximum: optionCount - 1 },
      explanation: isThisOrThat ? { type: 'null' } : { type: 'string' },
    },
    required: ['question', 'options', 'correctAnswerIndex', 'explanation'],
  };

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      questions: { type: 'array', items: optionSchema, minItems: numQuestions, maxItems: numQuestions },
    },
    required: ['questions'],
  };

  const system = `
You are an expert quiz creator for social media videos.
${searchInstruction}

RULES:
${questionFormatInstruction}
${seasonalInstruction}
- Generate exactly ${numQuestions} questions with exactly ${optionCount} options each.
${quizType === 'Multiple Choice' ? '- VARY the position of the correct answer across questions.' : ''}
${isThisOrThat
    ? '- For "This or That" questions, correctAnswerIndex and explanation MUST both be null.'
    : '- Provide the correct 0-based index and a brief one-sentence explanation.'}

DIVERSITY:
- STRICTLY AVOID REPETITION between generations. The RandomSeed below must genuinely change your picks.
- For Flags/Countries/Geography topics, include countries from DIFFERENT continents in the same quiz, and scale obscurity with difficulty (Easy: top-20 famous flags; Hard: confusingly similar flags; Expert and above: genuinely obscure nations and territories, chosen from the full list of ~195 countries rather than the usual "unique flag" suspects).
${useWebSearch ? `\nOutput ONLY a JSON object of the form {"questions": [...]} matching this schema, with no prose or markdown around it: ${JSON.stringify(schema)}` : ''}
  `.trim();

  let prompt = `Topic: ${topic}`;
  if (audience !== 'Default') prompt += `\nAudience: ${audience}`;
  if (difficulty !== 'Default') prompt += `\nDifficulty: ${difficulty}`;
  prompt += `\nFormat: ${quizType}`;
  if (isSeasonal && season) prompt += `\nSeasonal theme: ${season}`;
  prompt += `\nRandomSeed: ${Math.floor(Math.random() * 10000000)}`;

  try {
    const { json, sources } = await callClaudeForJson({
      system,
      prompt,
      schema: useWebSearch ? undefined : schema,
      useWebSearch,
      maxTokens: 8000,
    });

    const questions = Array.isArray(json) ? json : json?.questions;
    if (!Array.isArray(questions) || !questions.length || !questions[0]?.question) {
      throw new Error('Claude did not return any usable questions.');
    }

    return { questions: questions.slice(0, numQuestions), sources };
  } catch (error) {
    console.error('Quiz generation failed:', error);
    throw new Error(`Failed to generate quiz: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

/**
 * Claude writes the artwork itself as an SVG, which we hand back as a data URL.
 * Claude is a text model with no image-generation endpoint, so vector art is the
 * native way to get generated visuals out of it.
 */
export async function generateBackgroundImage(
  subject: string,
  aspectRatio: '1:1' | '9:16' | '16:9' = '16:9',
): Promise<string> {
  const [w, h] = { '1:1': [1080, 1080], '9:16': [1080, 1920], '16:9': [1920, 1080] }[aspectRatio];

  const system = `
You are a graphic designer who works directly in SVG.
Produce ONE complete, self-contained SVG illustration.

RULES:
- Output ONLY the SVG markup, starting with <svg and ending with </svg>. No markdown, no commentary.
- Use viewBox="0 0 ${w} ${h}" and width="${w}" height="${h}".
- Bold, poster-like, high-contrast composition that reads at a glance on a phone screen.
- Use gradients, geometric shapes and simple silhouettes. No <text> elements, no external references, no <image>, no <script>.
  `.trim();

  const { text } = await callClaude({
    system,
    prompt: `Design a background illustration representing: ${subject}`,
    maxTokens: 8000,
  });

  const match = text.match(/<svg[\s\S]*<\/svg>/i);
  if (!match) throw new Error('Claude did not return a usable SVG illustration.');

  const svg = match[0];
  if (/<script|<image|xlink:href|href\s*=\s*["']https?:/i.test(svg)) {
    throw new Error('Generated illustration contained unsupported external content.');
  }

  // encodeURIComponent keeps non-ASCII (emoji, accents) safe in a data URL.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * A short musical stinger for the video intro. Claude composes the notes and the
 * browser synthesises them offline into a WAV blob (see utils/audio.ts).
 */
export async function generateThemeSound(topic: string): Promise<Blob> {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      tempo: { type: 'integer', minimum: 60, maximum: 200 },
      waveform: { type: 'string', enum: ['sine', 'square', 'sawtooth', 'triangle'] },
      notes: {
        type: 'array',
        minItems: 3,
        maxItems: 12,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            midi: { type: 'integer', minimum: 36, maximum: 96 },
            start: { type: 'number', minimum: 0, maximum: 5 },
            duration: { type: 'number', minimum: 0.05, maximum: 2 },
            gain: { type: 'number', minimum: 0.05, maximum: 1 },
          },
          required: ['midi', 'start', 'duration', 'gain'],
        },
      },
    },
    required: ['tempo', 'waveform', 'notes'],
  };

  const system = `
You compose short musical stingers for quiz videos.
Design a punchy 2-4 second intro stinger that matches the mood of the topic.
Note timings are in seconds from the start; notes may overlap to form chords.
Keep the whole stinger under 5 seconds and end on a satisfying resolution.
  `.trim();

  const { json } = await callClaudeForJson({
    system,
    prompt: `Compose an intro stinger for a quiz video about: "${topic}"`,
    schema,
    maxTokens: 2000,
  });

  return synthesizeStinger(json);
}

export async function rewriteTextWithPersona(text: string, persona: string): Promise<string> {
  const { text: rewritten } = await callClaude({
    system: `You are a script editor. Rewrite the user's text in the voice of this persona: "${persona}". Keep the meaning exactly the same - only change tone and vocabulary. Return ONLY the rewritten text, with no preamble or quotation marks.`,
    prompt: text,
    maxTokens: 1000,
  });

  if (!rewritten.trim()) throw new Error('Claude returned an empty rewrite.');
  return rewritten.trim();
}

export async function suggestTopics(
  currentTopic = '',
  quizType = 'Multiple Choice',
  isSeasonal = false,
  season = '',
): Promise<string[]> {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: { topics: { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5 } },
    required: ['topics'],
  };

  const seasonalInstruction = isSeasonal && season
    ? `The topics MUST relate to the current season: ${season}.`
    : 'Suggest general topics suitable for the format.';

  const { json } = await callClaudeForJson({
    system: `Generate 5 engaging, concise (3-5 word) quiz topics for a social media video in the "${quizType}" format. ${seasonalInstruction}`,
    prompt: currentTopic.trim()
      ? `Suggest 5 ${quizType} quiz topics related to: ${currentTopic}`
      : `Suggest 5 general ${quizType} quiz topics.`,
    schema,
    maxTokens: 1000,
  });

  if (!Array.isArray(json?.topics) || !json.topics.length) throw new Error('No topic suggestions returned.');
  return json.topics;
}

export async function suggestTrendingTopics(): Promise<string[]> {
  const { json } = await callClaudeForJson({
    system: `
You are a social media trend expert.
Use web search to find what people are actually talking about right now, then propose 5 viral quiz topics.
Each topic must be 3-5 words and suitable for a short-form video quiz.
Output ONLY a JSON array of 5 strings, e.g. ["Topic One", "Topic Two", "Topic Three", "Topic Four", "Topic Five"].
    `.trim(),
    prompt: 'Suggest 5 trending quiz topics based on current events.',
    useWebSearch: true,
    maxTokens: 4000,
  });

  const topics = Array.isArray(json) ? json : json?.topics;
  if (!Array.isArray(topics) || !topics.length) throw new Error('No trending topics returned.');
  return topics.slice(0, 5);
}

export async function generateAITitle(
  topic: string,
  audience: string,
  difficulty: string,
  quizType: string,
  numQuestions: number,
  isSeasonal: boolean,
  season: string,
  category: string,
): Promise<string> {
  const challengeInstruction = quizType === 'This or That'
    ? `
- The title MUST be a question prompting viewers for their opinion or choice (e.g. "Which side are you on?", "Pick your favourite!").
- It must NOT imply there are correct answers or a score.`
    : `
- The title MUST be a direct challenge to the viewer (e.g. "Can you get all ${numQuestions} right?").
- It MUST be verifiable - no "Only 1% know..." style claims.
- If it mentions a number of questions, that number MUST be ${numQuestions}.`;

  const difficultyInstruction = difficulty !== 'Default'
    ? `- The title MUST indicate the difficulty, for example by including "(${difficulty})".`
    : '';

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: { title: { type: 'string' } },
    required: ['title'],
  };

  const system = `
You are a social media expert creating a viral quiz video title.

RULES:
- Under 150 characters.
- Include 1-2 relevant emojis.
${challengeInstruction}
${isSeasonal && season ? `- Subtly hint at the current season: ${season}.` : ''}
${difficultyInstruction}
- Include 2-3 relevant hashtags at the end of the title text.
- The string MUST end with the branding: " Social_Quiz_[${category}]".
- Do NOT use quotation marks anywhere in the title.
Example: Can You Guess These Movies? 🎬🍿 #movietrivia #quizchallenge Social_Quiz_[Movies]
  `.trim();

  let prompt = `Topic: ${topic}, Format: ${quizType}, Questions: ${numQuestions}, Category: ${category}`;
  if (audience !== 'Default') prompt += `, Audience: ${audience}`;
  if (difficulty !== 'Default') prompt += `, Difficulty: ${difficulty}`;
  if (isSeasonal) prompt += `, Season: ${season}`;

  const { json } = await callClaudeForJson({ system, prompt, schema, maxTokens: 1000 });
  if (typeof json?.title !== 'string' || !json.title.trim()) throw new Error('Invalid title returned.');
  return json.title.trim();
}

export async function generateHashtags(topic: string, quizType: string): Promise<string[]> {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: { hashtags: { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 7 } },
    required: ['hashtags'],
  };

  const { json } = await callClaudeForJson({
    system: `
You are a social media expert. Generate 5-7 hashtags for a quiz video.
Mix broad tags (quiz, trivia) with 3-4 niche tags specific to the topic.
The quiz format is "${quizType}". Do NOT include the '#' symbol.
    `.trim(),
    prompt: `Generate hashtags for a quiz video about: "${topic}"`,
    schema,
    maxTokens: 1000,
  });

  if (!Array.isArray(json?.hashtags) || !json.hashtags.length) throw new Error('No hashtags returned.');
  return json.hashtags;
}

export async function generateCategory(topic: string): Promise<string> {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: { category: { type: 'string' } },
    required: ['category'],
  };

  try {
    const { json } = await callClaudeForJson({
      system: 'Categorise the quiz topic into ONE broad single-word category (e.g. History, Science, Movies, Music, Geography, Gaming, Sports, General). Use "General" when nothing fits.',
      prompt: `What is a single broad category for a quiz about: "${topic}"?`,
      schema,
      maxTokens: 500,
    });
    return typeof json?.category === 'string' && json.category.trim() ? json.category.trim() : 'General';
  } catch (error) {
    console.error('Category generation failed:', error);
    return 'General';
  }
}

export async function suggestStyle(
  topic: string,
  themes: { id: string, name: string }[],
  movements: { id: string, name: string }[],
): Promise<{ themeId: string, movementId: string }> {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      themeId: { type: 'string', enum: themes.map(t => t.id) },
      movementId: { type: 'string', enum: movements.map(m => m.id) },
    },
    required: ['themeId', 'movementId'],
  };

  try {
    const { json } = await callClaudeForJson({
      system: `
You are a visual designer picking the colour theme and background movement for a quiz video.
Available themes: ${JSON.stringify(themes.map(t => ({ id: t.id, name: t.name })))}
Available movements: ${JSON.stringify(movements.map(m => ({ id: m.id, name: m.name })))}
      `.trim(),
      prompt: `Pick the best theme and movement for a video about: "${topic}"`,
      schema,
      maxTokens: 1000,
    });

    return {
      themeId: themes.some(t => t.id === json?.themeId) ? json.themeId : themes[0].id,
      movementId: movements.some(m => m.id === json?.movementId) ? json.movementId : movements[0].id,
    };
  } catch (error) {
    console.error('Style suggestion failed:', error);
    return { themeId: themes[0].id, movementId: movements[0].id };
  }
}

export async function generateFunFact(question: string, answer: string): Promise<string> {
  try {
    const { text } = await callClaude({
      system: 'You are a trivia expert. Given a quiz question and its correct answer, write ONE short, engaging sentence of extra context. Do not simply restate the answer. Return plain text only.',
      prompt: `Question: ${question}\nCorrect answer: ${answer}`,
      maxTokens: 500,
    });
    return text.trim();
  } catch (error) {
    console.error('Fun fact generation failed:', error);
    return '';
  }
}

/** Polishes a line so it reads naturally when spoken aloud in a voiceover. */
export async function generateVoiceoverScript(text: string, kind: 'question' | 'answer'): Promise<string> {
  const { text: script } = await callClaude({
    system: `You rewrite quiz lines so they sound natural when read aloud as a short-form video voiceover. Keep it to one or two spoken sentences, keep every fact identical, and return ONLY the spoken words - no stage directions, no quotation marks.`,
    prompt: `Rewrite this ${kind} for a spoken voiceover:\n${text}`,
    maxTokens: 500,
  });
  return script.trim() || text;
}
