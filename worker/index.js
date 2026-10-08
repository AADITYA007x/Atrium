// Atrium's server: serves the built site and answers "Talk to the heart" through Google Gemini.
// The Gemini key lives in a Cloudflare secret (GEMINI_API_KEY) and never reaches the browser.

import { PARTS, GROUPS, theName, PLURAL_PARTS } from '../src/parts.js';
import { FACTS } from '../src/facts.js';
import { KNOWLEDGE } from '../src/knowledge.js';

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
// If a model is busy (Google's free tier often is), try these next. Each model has its own free quota.
const FALLBACK_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
const MAX_MESSAGE = 600;
const MAX_TURNS = 12;

const SPEAKERS = {
  heart: {
    name: 'the heart',
    persona:
      'You are the human heart, the whole organ, speaking in the first person. You are calm, warm and a little wry, like an old friend who has been working without a break for a lifetime.',
  },
  rbc: {
    name: 'a red blood cell',
    persona:
      'You are a single red blood cell travelling round the body, speaking in the first person. You are curious, cheerful and a little breathless, always on the move, and proud of the oxygen you carry.',
  },
};

function speakerFor(id) {
  if (SPEAKERS[id]) return { id, ...SPEAKERS[id] };
  const part = PARTS[id];
  if (!part) return null;
  const kind = GROUPS[part.group]?.label?.toLowerCase() ?? 'part';
  return {
    id,
    name: theName(part.name),
    persona: `You are ${theName(part.name)} (${kind}${part.side ? ` in the ${part.side}` : ''}) of a human heart, speaking in the first person${PLURAL_PARTS.includes(id) ? ' plural, as "we", because you are many strands working together' : ''}. You are calm and quietly proud of your one job, and you see the heart from where you sit.`,
  };
}

function partNotes(id) {
  const part = PARTS[id];
  const f = FACTS[id];
  if (!part || !f) return '';
  const links = f.connects.map((c) => PARTS[c]?.name).filter(Boolean).join(', ');
  return [
    `## ${part.name}`,
    `What it does: ${f.does}`,
    `Worth knowing: ${f.fact}`,
    links ? `Connects to: ${links}.` : '',
    f.note ? `Accuracy note: ${f.note}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function systemPrompt(speaker) {
  const general = KNOWLEDGE.map((k) => `## ${k.topic}\n${k.notes.map((n) => `- ${n}`).join('\n')}`).join('\n\n');
  const own = PARTS[speaker.id] ? `# About you\n${partNotes(speaker.id)}\n\n` : '';
  const parts = Object.keys(PARTS)
    .filter((id) => id !== speaker.id)
    .map(partNotes)
    .join('\n\n');

  return `${speaker.persona}

You live inside Atrium, a calm interactive 3D heart that people explore in their browser.

# How to answer
- Stay in character as ${speaker.name}, in the first person, warm and plain-spoken. Use simple words; explain any technical term the first time.
- Keep answers short: two to five sentences, unless the visitor asks for more. No headings or bullet lists unless asked.
- Use ONLY the facts in "Atrium's notes" below. Do not add numbers, names or claims that are not there.
- If the notes do not cover the question, say so honestly in character (for example "That is beyond what I know here"), and if you can, mention something related that the notes do cover.
- If the notes say something is simplified or uncertain, say so.
- You may explain how other parts of the heart work, using their notes.
- Questions about anything other than the heart, blood and circulation: gently say you only know about the heart, and steer back.

# Safety
- You are educational only. Never give medical advice, diagnosis, or advice about symptoms, tests, treatments, medicines, exercise or diet for a real person.
- If the visitor describes their own or someone else's symptoms or health, step out of character for one sentence: say you cannot give medical advice and that a doctor or other health professional is the right person to ask. You may then explain the general anatomy involved.
- If the visitor mentions chest pain, trouble breathing, fainting or any emergency happening now, step out of character and tell them to contact local emergency services right away. Do not continue the lesson in that reply.
- Never claim to be a real doctor, and never pretend Atrium can measure or check anyone's heart.

# Atrium's notes
${own}${general}

# Notes on every part of the heart in Atrium
${parts}`;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function chat(request, env) {
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  if (!env.GEMINI_API_KEY) return json({ error: 'The chat is not set up yet: the GEMINI_API_KEY secret is missing.' }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'The request could not be read.' }, 400);
  }

  const speaker = speakerFor(String(body?.speaker ?? 'heart'));
  if (!speaker) return json({ error: 'Unknown speaker.' }, 400);

  const history = Array.isArray(body?.messages) ? body.messages.slice(-MAX_TURNS) : [];
  const contents = [];
  for (const m of history) {
    const text = String(m?.text ?? '').trim().slice(0, MAX_MESSAGE);
    if (!text) continue;
    const role = m.role === 'model' ? 'model' : 'user';
    // Gemini needs the turns to alternate; merge repeats
    if (contents.length && contents[contents.length - 1].role === role) contents[contents.length - 1].parts[0].text += `\n${text}`;
    else contents.push({ role, parts: [{ text }] });
  }
  while (contents.length && contents[0].role !== 'user') contents.shift();
  if (!contents.length || contents[contents.length - 1].role !== 'user') return json({ error: 'Ask something first.' }, 400);

  const models = [...new Set([env.GEMINI_MODEL || DEFAULT_MODEL, DEFAULT_MODEL, ...FALLBACK_MODELS])];
  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt(speaker) }] },
    contents,
    generationConfig: { temperature: 0.6, maxOutputTokens: 1500 },
  });

  let res = null;
  let lastStatus = 0;
  attempts: for (const model of models) {
    // Busy or briefly failing: wait a moment and try once more before moving to the next model
    for (let attempt = 0; attempt < 2; attempt++) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
          body: payload,
        });
      } catch {
        res = null;
        lastStatus = 0;
        break;
      }
      lastStatus = res.status;
      if (res.ok) break attempts;
      const detail = await res.text().catch(() => '');
      console.log('Gemini', model, res.status, detail.slice(0, 300));
      if (res.status === 503 || res.status === 500) {
        if (attempt === 0) await new Promise((r) => setTimeout(r, 700));
        continue;
      }
      // Out of free quota for this model, or the model name is not available: try the next model
      if (res.status === 429 || res.status === 404) break;
      // Anything else (such as a bad key) will not be fixed by another model
      break attempts;
    }
  }

  if (!res || !res.ok) {
    if (lastStatus === 0) return json({ error: 'Gemini could not be reached. Try again in a moment.' }, 502);
    if (lastStatus === 503 || lastStatus === 500)
      return json({ error: 'Google\u2019s free models are very busy right now. Wait a few seconds and ask again.' }, 503);
    if (lastStatus === 429) return json({ error: 'The free plan\u2019s limit has been reached for now. Wait a minute, then ask again.' }, 429);
    if (lastStatus === 400 || lastStatus === 401 || lastStatus === 403)
      return json({ error: 'Gemini did not accept the request. Check that GEMINI_API_KEY is set correctly.' }, 502);
    return json({ error: `Gemini returned an error (${lastStatus}). Try again in a moment.` }, 502);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  if (!text) {
    const blocked = data?.promptFeedback?.blockReason || candidate?.finishReason === 'SAFETY';
    return json({ error: blocked ? 'That question could not be answered here. Try asking it another way.' : 'No answer came back. Try asking again.' }, 502);
  }
  return json({ text, speaker: speaker.name });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/chat') return chat(request, env);
    return env.ASSETS.fetch(request);
  },
};