import Anthropic from '@anthropic-ai/sdk'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export type AIModel = 'claude-sonnet' | 'claude-haiku'

const MODEL_IDS: Record<AIModel, string> = {
  'claude-sonnet': 'claude-sonnet-4-20250514',
  'claude-haiku': 'claude-haiku-3-5-20241022',
}

interface GenerateOptions {
  model?: AIModel
  maxTokens?: number
  temperature?: number
}

interface GenerateResult<T> {
  data: T
  usage: {
    inputTokens: number
    outputTokens: number
  }
}

/**
 * Generate a JSON response from Claude
 */
export async function generateJSON<T>(
  prompt: string,
  systemPrompt: string,
  options: GenerateOptions = {}
): Promise<GenerateResult<T>> {
  const {
    model = 'claude-sonnet',
    maxTokens = 4096,
    temperature = 0.7,
  } = options

  const response = await anthropic.messages.create({
    model: MODEL_IDS[model],
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  // Extract text content
  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in response')
  }

  // Parse JSON from response
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in response')
  }

  const data = JSON.parse(jsonMatch[0]) as T

  return {
    data,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  }
}

/**
 * Generate a text response from Claude
 */
export async function generateText(
  prompt: string,
  systemPrompt: string,
  options: GenerateOptions = {}
): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }> {
  const {
    model = 'claude-sonnet',
    maxTokens = 4096,
    temperature = 0.7,
  } = options

  const response = await anthropic.messages.create({
    model: MODEL_IDS[model],
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in response')
  }

  return {
    text: textContent.text,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  }
}

export { anthropic }
