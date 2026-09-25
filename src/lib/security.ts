import DOMPurify from 'dompurify'
import { marked } from 'marked'

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'a',
  'hr',
  'span',
]

/**
 * Markdown → bezpečné HTML pre romantické listy/texty kapitol. Nikdy
 * nepovoľuje <script>, event handlery (onclick a pod.) ani iframe/object.
 */
export function renderMarkdownSafe(markdown: string): string {
  const rawHtml = marked.parse(markdown, { async: false, breaks: true }) as string
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })
}
