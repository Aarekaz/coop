import { parseDocument, LineCounter, isMap, isSeq, isScalar, type Node } from "yaml";

export interface YamlPosition {
  line: number;
  col: number;
}

export interface YamlError {
  message: string;
  line: number;
  col: number;
}

export interface ParseResult {
  data: unknown;
  errors: YamlError[];
  positionOf: (path: (string | number)[]) => YamlPosition | null;
}

export function parseYaml(text: string): ParseResult {
  const lineCounter = new LineCounter();
  const doc = parseDocument(text, { lineCounter });

  const errors: YamlError[] = doc.errors.map((e) => {
    const linePos = e.linePos?.[0];
    return {
      message: e.message,
      line: linePos?.line ?? 1,
      col: linePos?.col ?? 1,
    };
  });

  function positionOf(path: (string | number)[]): YamlPosition | null {
    let node: Node | null | undefined = doc.contents;
    for (const segment of path) {
      if (isMap(node)) {
        const pair = node.items.find((p) => {
          if (isScalar(p.key)) return p.key.value === segment;
          return false;
        });
        if (!pair) return null;
        node = pair.value as Node | null | undefined;
      } else if (isSeq(node) && typeof segment === "number") {
        if (segment < 0 || segment >= node.items.length) return null;
        node = node.items[segment] as Node | null | undefined;
      } else {
        return null;
      }
    }

    if (!node || typeof node !== "object" || !("range" in node)) return null;
    const range = node.range;
    if (!range) return null;
    const pos = lineCounter.linePos(range[0]);
    return { line: pos.line, col: pos.col };
  }

  return { data: doc.toJS(), errors, positionOf };
}
