/**
 * AgentEval — Safe Template Engine
 * 
 * Data-substitution-only template engine.
 * Replaces {{variable}} placeholders with context values.
 * 
 * SECURITY:
 * - No code execution
 * - No function calls
 * - No nested templates
 * - No prototype pollution
 */

const TEMPLATE_REGEX = /\{\{(\w+)\}\}/g;

export interface TemplateContext {
  input: string;
  executionId?: string;
  scenarioId?: string;
  evaluationId?: string;
  agentVersion?: string;
  agentId?: string;
  timestamp?: string;
  [key: string]: string | undefined;
}

/**
 * Apply template substitution.
 * 
 * @param template - Template string with {{variable}} placeholders
 * @param context - Values to substitute
 * @returns The template with placeholders replaced
 * 
 * @example
 * applyTemplate('{"message": "{{input}}"}', { input: "Hello" })
 * // Returns: '{"message": "Hello"}'
 */
export function applyTemplate(template: string, context: TemplateContext): string {
  return template.replace(TEMPLATE_REGEX, (match, key) => {
    const value = context[key];
    if (value === undefined) {
      // Leave unresolved placeholders as-is rather than injecting "undefined"
      return match;
    }
    // Escape the value for JSON safety
    return escapeJsonValue(value);
  });
}

/**
 * Escape a string value for safe JSON embedding.
 * Handles quotes, backslashes, and control characters.
 */
function escapeJsonValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Validate a template string.
 * Returns the list of placeholder variables found.
 */
export function validateTemplate(template: string): { valid: boolean; variables: string[]; errors: string[] } {
  const errors: string[] = [];
  const variables: string[] = [];

  // Check for valid JSON structure (if it looks like JSON)
  if (template.trim().startsWith('{') || template.trim().startsWith('[')) {
    try {
      // Replace all placeholders with dummy values to test JSON validity
      const testValue = template.replace(TEMPLATE_REGEX, (_, key) => {
        variables.push(key);
        return 'test_value';
      });
      JSON.parse(testValue);
    } catch {
      errors.push('Template produces invalid JSON when placeholders are filled');
    }
  }

  // Extract variables without JSON test
  if (variables.length === 0) {
    let match;
    const regex = new RegExp(TEMPLATE_REGEX);
    while ((match = regex.exec(template)) !== null) {
      variables.push(match[1]);
    }
  }

  if (!variables.includes('input')) {
    errors.push('Template must contain at least a {{input}} placeholder');
  }

  return { valid: errors.length === 0, variables, errors };
}

/**
 * Extract a value from a JSON response using a simple dot/bracket path.
 * 
 * Supports paths like:
 * - $.response
 * - $.message
 * - $.data.answer
 * - $.choices[0].message.content
 * 
 * @param data - Parsed JSON response
 * @param path - JSONPath-like expression
 * @returns The extracted value as a string, or null if not found
 */
export function extractResponseValue(data: unknown, path: string): string | null {
  if (!path || !data) return null;

  // Remove leading $. if present
  let cleanPath = path.startsWith('$.') ? path.substring(2) : path;
  if (cleanPath.startsWith('.')) cleanPath = cleanPath.substring(1);

  // Split path into segments, handling array notation
  const segments = cleanPath.match(/[^.\[\]]+|\[\d+\]/g);
  if (!segments) return null;

  let current: unknown = data;

  for (const segment of segments) {
    if (current === null || current === undefined) return null;

    // Array index: [0], [1], etc.
    const indexMatch = segment.match(/^\[(\d+)\]$/);
    if (indexMatch) {
      if (!Array.isArray(current)) return null;
      const index = parseInt(indexMatch[1], 10);
      current = (current as unknown[])[index];
    } else {
      // Object property
      if (typeof current !== 'object') return null;
      current = (current as Record<string, unknown>)[segment];
    }
  }

  if (current === null || current === undefined) return null;
  if (typeof current === 'string') return current;
  return JSON.stringify(current);
}
