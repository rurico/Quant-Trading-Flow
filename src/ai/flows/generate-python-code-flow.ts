
// src/ai/flows/generate-python-code-flow.ts
'use server';
/**
 * @fileOverview 根据自然语言提示生成或修改 Python 代码的 Flow。
 *
 * - generatePythonCode - 根据自然语言提示生成或修改 Python 代码。
 * - GeneratePythonCodeInput - Flow 的输入类型。
 * - GeneratePythonCodeOutput - Flow 的输出类型。
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod'; // Genkit 依赖 zod 进行模式定义

const GeneratePythonCodeInputSchema = z.object({
  naturalLanguagePrompt: z.string().describe('要生成或修改的 Python 函数的自然语言描述。'),
  existingCode: z.string().optional().describe('编辑器中已有的 Python 代码（可选）。如果提供，则 AI 应尝试修改此代码。'),
});
export type GeneratePythonCodeInput = z.infer<typeof GeneratePythonCodeInputSchema>;

const GeneratePythonCodeOutputSchema = z.object({
  pythonCode: z.string().describe('生成或修改后的 Python 代码。'),
});
export type GeneratePythonCodeOutput = z.infer<typeof GeneratePythonCodeOutputSchema>;

export async function generatePythonCode(input: GeneratePythonCodeInput): Promise<GeneratePythonCodeOutput> {
  return generatePythonCodeFlow(input);
}

const codeGenerationPrompt = ai.definePrompt({
  name: 'generateOrModifyPythonCodePrompt', // 重命名以反映新功能
  input: { schema: GeneratePythonCodeInputSchema },
  output: { schema: GeneratePythonCodeOutputSchema },
  prompt: `您是一位专业的 Python 程序员。
{{#if existingCode}}
请根据以下自然语言描述修改现有的 Python 函数。
确保函数结构良好并遵循 Python 最佳实践。
请仅输出修改后的完整 Python 代码块本身，不要包含任何周围的文本、解释或 markdown 格式。

现有代码:
\`\`\`python
{{{existingCode}}}
\`\`\`

描述 (需要进行的修改):
{{{naturalLanguagePrompt}}}

修改后的 Python 代码:
{{else}}
请根据以下自然语言描述生成一个完整的 Python 函数。
确保函数结构良好并遵循 Python 最佳实践。
请仅输出 Python 代码块本身，不要包含任何周围的文本、解释或 markdown 格式。

描述:
{{{naturalLanguagePrompt}}}

生成的 Python 代码:
{{/if}}
`,
});

const generatePythonCodeFlow = ai.defineFlow(
  {
    name: 'generateOrModifyPythonCodeFlow', // 重命名以反映新功能
    inputSchema: GeneratePythonCodeInputSchema,
    outputSchema: GeneratePythonCodeOutputSchema,
  },
  async (input) => {
    const { output } = await codeGenerationPrompt(input);
    
    if (!output || typeof output.pythonCode !== 'string') {
        console.error('AI 未返回有效的 Python 代码。输出:', output);
        throw new Error('AI 未能生成或修改有效的 Python 代码。');
    }
    
    // 清理 Gemini 可能添加的 markdown 代码块标记
    let code = output.pythonCode;
    if (code.startsWith('```python\n')) {
        code = code.substring('```python\n'.length);
    }
    if (code.endsWith('\n```')) {
        code = code.substring(0, code.length - '\n```'.length);
    }
    
    return { pythonCode: code.trim() };
  }
);
