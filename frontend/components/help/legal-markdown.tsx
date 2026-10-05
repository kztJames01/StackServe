import { ReactNode } from "react"
import fs from "fs"
import path from "path"

export function readLegalDoc(filename: string) {
  const candidates = [path.join(process.cwd(), filename), path.join(process.cwd(), "..", filename)]
  const found = candidates.find((item) => fs.existsSync(item))
  if (!found) return "This legal document could not be loaded."
  return fs.readFileSync(found, "utf8").replace(/\\([\\`*_{}[\]()#+\-.!|&$])/g, "$1")
}

function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index} className="text-foreground">{part.slice(2, -2)}</strong>
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      const label = link[1].replace(/\*\*/g, "")
      return <a key={index} className="underline" href={link[2]}>{label}</a>
    }
    return <span key={index}>{part}</span>
  })
}

export function LegalMarkdown({ source }: { source: string }) {
  const lines = source.replace(/\r/g, "").split("\n")
  const blocks: ReactNode[] = []
  let i = 0
  let skippedTitle = false

  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) { i += 1; continue }
    if (!skippedTitle && line.startsWith("# ")) { skippedTitle = true; i += 1; continue }
    if (line.startsWith("---")) { i += 1; continue }
    if (line.startsWith("### ")) {
      blocks.push(<h3 key={i} className="text-base font-semibold text-foreground">{inline(line.slice(4))}</h3>)
      i += 1
      continue
    }
    if (line.startsWith("## ")) {
      blocks.push(<h2 key={i} className="pt-2 text-lg font-semibold text-foreground">{inline(line.slice(3))}</h2>)
      i += 1
      continue
    }
    if (line.startsWith("|")) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim())
        if (!cells.every((cell) => /^:?-+:?$/.test(cell))) rows.push(cells)
        i += 1
      }
      blocks.push(
        <div key={`table-${i}`} className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-2 py-2 align-top">{inline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }
    if (line.startsWith("* ") || line.startsWith("- ") || /^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && (lines[i].trim().startsWith("* ") || lines[i].trim().startsWith("- ") || /^\d+\.\s/.test(lines[i].trim()))) {
        items.push(lines[i].trim().replace(/^(\*\s+|-\s+|\d+\.\s+)/, ""))
        i += 1
      }
      blocks.push(
        <ul key={`list-${i}`} className="list-disc space-y-2 pl-5">
          {items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}
        </ul>
      )
      continue
    }
    const para = [line]
    i += 1
    while (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith("#") && !lines[i].trim().startsWith("|") && !lines[i].trim().startsWith("* ") && !lines[i].trim().startsWith("- ") && !/^\d+\.\s/.test(lines[i].trim()) && lines[i].trim() !== "---") {
      para.push(lines[i].trim())
      i += 1
    }
    blocks.push(<p key={`p-${i}`}>{inline(para.join(" "))}</p>)
  }

  return <div className="space-y-3 text-muted-foreground">{blocks}</div>
}
