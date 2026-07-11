import { useMemo } from 'react'
import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true })

// Models emit LaTeX ($x$, \(x\), $$x$$). We don't ship a math engine — instead
// we unwrap the delimiters and render the inner expression as inline code, which
// is readable and never leaks raw \frac{}{} noise into prose.
function tameLatex(src) {
  return src
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => '\n\n`' + m.trim() + '`\n\n')
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => '\n\n`' + m.trim() + '`\n\n')
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => '`' + m.trim() + '`')
    .replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (_, p, m) => p + '`' + m.trim() + '`')
}

// Strip anything that could execute; we only ever render model text.
function sanitize(html) {
  const d = document.createElement('div')
  d.innerHTML = html
  d.querySelectorAll('script,style,iframe,object,embed').forEach((n) => n.remove())
  d.querySelectorAll('*').forEach((el) => {
    for (const a of [...el.attributes]) {
      if (/^on/i.test(a.name) || (a.name === 'href' && /^javascript:/i.test(a.value))) {
        el.removeAttribute(a.name)
      }
    }
  })
  return d.innerHTML
}

export default function Markdown({ text }) {
  const html = useMemo(() => sanitize(marked.parse(tameLatex(text || ''))), [text])
  return <div className="md" dangerouslySetInnerHTML={{ __html: html }} />
}
