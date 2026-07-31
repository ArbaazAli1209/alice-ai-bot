// groq.js
// Thin wrapper around Groq's API (OpenAI-compatible /openai/v1/chat/completions).

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * @param {Array<{role: "system"|"user"|"assistant", content: string}>} messages
 * @returns {Promise<string>} the model's reply text
 */
async function askGroq(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY in environment");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      messages,
      temperature: 1.0,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Groq API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("Empty response from Groq API");
  return reply;
}

module.exports = { askGroq };