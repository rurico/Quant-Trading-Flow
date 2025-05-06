
export interface ParsedPythonFunction {
  inputs: string[];
  outputs: string[];
}
export function parsePythonFunction(code: string): ParsedPythonFunction {
  const inputs: string[] = [];
  const outputs: string[] = [];
  const funcDefRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*:/;
  const funcMatch = code.match(funcDefRegex);
  if (funcMatch && funcMatch[2]) {
    const paramsString = funcMatch[2].trim();
    if (paramsString) {
      const paramsArray = paramsString.split(/,(?![^()]*\))/).map(param => {
        return param.split(':')[0].split('=')[0].trim();
      });
      inputs.push(...paramsArray.filter(p => p !== '' && p !== 'self' && p !== 'cls'));
    }
  }
  const lines = code.split('\n');
  let maxOutputCount = 0;
  let potentialOutputString = "";
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('#') || trimmedLine.startsWith('"""') || trimmedLine.startsWith("'''")) {
      continue;
    }
    const returnMatch = trimmedLine.match(/^return\s+(.+)/);
    if (returnMatch && returnMatch[1]) {
      const returnValuesString = returnMatch[1].trim();
      if (returnValuesString?.toLowerCase() === 'none') {
        if (maxOutputCount === 0) {
          potentialOutputString = "";
        }
        continue;
      }
      const currentOutputItems = returnValuesString.split(/,(?![^()\[\]{}]*\))/)
        .map(s => s.trim())
        .filter(s => s !== '');
      if (currentOutputItems.length > maxOutputCount) {
        maxOutputCount = currentOutputItems.length;
        potentialOutputString = returnValuesString;
      }
    } else if (trimmedLine === 'return') {
      if (maxOutputCount === 0) {
        potentialOutputString = "";
      }
      continue;
    }
  }
  if (maxOutputCount > 0 && potentialOutputString) {
    const finalOutputItems = potentialOutputString.split(/,(?![^()\[\]{}]*\))/)
      .map(s => s.trim())
      .filter(s => s !== '');
    outputs.push(...finalOutputItems);
  }
  return { inputs, outputs };
}
