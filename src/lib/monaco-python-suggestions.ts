// src/lib/monaco-python-suggestions.ts
import type { languages, IRange } from 'monaco-editor';

// Monaco 类型可能需要从 @monaco-editor/react 或 monaco-editor 包中获取更具体的类型
// 这里我们使用一个通用的 Monaco API 对象的概念
interface MonacoApi {
  languages: {
    CompletionItemKind: typeof languages.CompletionItemKind;
    CompletionItemInsertTextRule: typeof languages.CompletionItemInsertTextRule;
  };
}

export function getPythonSuggestions(monaco: MonacoApi, range: IRange) {
  return [
    { label: 'def', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'def ', range: range, detail: '定义一个函数' },
    { label: 'return', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'return ', range: range, detail: '从函数返回值' },
    { label: 'if', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'if ', range: range, detail: '条件语句' },
    { label: 'else', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'else:\n  ', range: range, detail: '条件语句' },
    { label: 'elif', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'elif ', range: range, detail: '条件语句' },
    { label: 'for', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'for i in range(${1:10}):\n  ${0:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'for i in range(10): ...' },
    { label: 'while', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'while ${1:condition}:\n  ${0:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'while condition: ...' },
    { label: 'import', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'import ', range: range, detail: '导入模块' },
    { label: 'from', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'from ', range: range, detail: '从模块导入特定部分' },
    { label: 'class', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'class ${1:MyClass}:\n  ${0:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: '定义一个类' },
    { label: 'try', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'try:\n  ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n  ${0:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: '异常处理' },
    { label: 'except', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'except ${1:Exception} as ${2:e}:\n  ${0:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: '异常处理' },
    { label: 'finally', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'finally:\n  ${0:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: '异常处理' },
    { label: 'with', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'with ${1:open("file.txt")} as ${2:f}:\n  ${0:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: '上下文管理器' },
    { label: 'pass', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'pass', range: range, detail: '空操作' },
    { label: 'True', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'True', range: range, detail: '布尔真值' },
    { label: 'False', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'False', range: range, detail: '布尔假值' },
    { label: 'None', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'None', range: range, detail: '空对象' },
    { label: 'print', kind: monaco.languages.CompletionItemKind.Function, insertText: 'print(${0})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'print(value, ..., sep=\' \', end=\'\\n\', file=sys.stdout, flush=False)' },
    { label: 'len', kind: monaco.languages.CompletionItemKind.Function, insertText: 'len(${0})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'len(s)' },
    { label: 'str', kind: monaco.languages.CompletionItemKind.Function, insertText: 'str(${0})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'str(object=\'\') -> str' },
    { label: 'int', kind: monaco.languages.CompletionItemKind.Function, insertText: 'int(${0})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'int(x=0) -> integer' },
    { label: 'float', kind: monaco.languages.CompletionItemKind.Function, insertText: 'float(${0})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'float(x=0.0) -> float' },
    { label: 'list', kind: monaco.languages.CompletionItemKind.Function, insertText: 'list(${0})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'list(iterable=(), /) -> new list initialized from iterable\'s items' },
    { label: 'dict', kind: monaco.languages.CompletionItemKind.Function, insertText: 'dict(${0})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'dict(**kwargs) -> new dictionary initialized with the name=value pairs' },
    { label: 'range', kind: monaco.languages.CompletionItemKind.Function, insertText: 'range(${0})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'range(stop) -> range object\nrange(start, stop[, step]) -> range object' },
    { label: 'enumerate', kind: monaco.languages.CompletionItemKind.Function, insertText: 'enumerate(${0})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'enumerate(iterable, start=0)' },
    { label: 'zip', kind: monaco.languages.CompletionItemKind.Function, insertText: 'zip(${0})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'zip(*iterables)' },
    { label: 'open', kind: monaco.languages.CompletionItemKind.Function, insertText: 'open(${1:"file.txt"}, ${2:"r"})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'open(file, mode=\'r\', buffering=-1, encoding=None, errors=None, newline=None, closefd=True, opener=None)' },
    { label: 'sum', kind: monaco.languages.CompletionItemKind.Function, insertText: 'sum(${0})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'sum(iterable, /, start=0)' },
    { label: 'min', kind: monaco.languages.CompletionItemKind.Function, insertText: 'min(${0})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'min(iterable, *[, key, default])' },
    { label: 'max', kind: monaco.languages.CompletionItemKind.Function, insertText: 'max(${0})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'max(iterable, *[, key, default])' },
    { label: 'abs', kind: monaco.languages.CompletionItemKind.Function, insertText: 'abs(${0})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'abs(x)' },
    { label: 'round', kind: monaco.languages.CompletionItemKind.Function, insertText: 'round(${0})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'round(number[, ndigits])' },
    { label: 'type', kind: monaco.languages.CompletionItemKind.Function, insertText: 'type(${0})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'type(object_or_name, bases, dict)' },
    { label: 'isinstance', kind: monaco.languages.CompletionItemKind.Function, insertText: 'isinstance(${1:object}, ${2:classinfo})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'isinstance(object, classinfo)' },
    { label: 'hasattr', kind: monaco.languages.CompletionItemKind.Function, insertText: 'hasattr(${1:object}, ${2:name})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'hasattr(object, name)' },
    { label: 'getattr', kind: monaco.languages.CompletionItemKind.Function, insertText: 'getattr(${1:object}, ${2:name}[, ${3:default}])', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'getattr(object, name[, default])' },
    { label: 'setattr', kind: monaco.languages.CompletionItemKind.Function, insertText: 'setattr(${1:object}, ${2:name}, ${3:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'setattr(object, name, value)' },
    { label: 'delattr', kind: monaco.languages.CompletionItemKind.Function, insertText: 'delattr(${1:object}, ${2:name})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: 'delattr(object, name)' },
    { label: 'super', kind: monaco.languages.CompletionItemKind.Function, insertText: 'super()', range: range, detail: 'super() -> same as super(__class__, <first argument>)' },
    { label: 'lambda', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'lambda ${1:arguments}: ${0:expression}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: '定义匿名函数' },
    { label: 'yield', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'yield ', range: range, detail: '用于生成器函数' },
    { label: 'assert', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'assert ${1:condition}, ${2:"message"}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range: range, detail: '断言语句' },
    { label: 'async', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'async ', range: range, detail: '定义异步函数' },
    { label: 'await', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'await ', range: range, detail: '等待异步操作' },
    { label: 'global', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'global ', range: range, detail: '声明全局变量' },
    { label: 'nonlocal', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'nonlocal ', range: range, detail: '声明非局部变量' },
    { label: 'raise', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'raise ', range: range, detail: '抛出异常' },
  ];
}
