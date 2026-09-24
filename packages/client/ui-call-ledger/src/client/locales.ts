/** `callLedger` namespace dictionaries for the call-ledger view. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'callLedger'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'view.calls': '工作流',
  'a11y.region': '工作流调用台账',
  'summary.turns': '用户对话',
  'summary.modelCalls': '模型调用',
  'summary.toolCalls': '工具调用',
  'summary.elapsed': '总耗时',
  'turn.label': '第 {turn} 轮',
  'turn.untitled': '本会话',
  'call.title': '模型调用 #{index}',
  'call.status.running': '进行中',
  'call.status.complete': '已完成',
  'call.status.error': '失败',
  'call.error': '错误：{message}',
  'section.request': 'REQUEST 请求',
  'section.response': 'RESPONSE 响应',
  'section.tools': '工具调用',
  'request.model': '模型',
  'request.unknownModel': '未知模型',
  'request.system': 'System',
  'request.messages': '消息',
  'request.toolDefinitions': '工具定义',
  'response.empty': '（无内容）',
  'response.reasoning': '推理',
  'response.content': '内容',
  'response.toolCalls': '工具调用',
  'token.title': 'Token',
  'token.input': '输入',
  'token.uncached': '未缓存',
  'token.cached': '缓存命中',
  'token.cacheWrite': '缓存写入',
  'token.output': '输出',
  'token.reasoning': '推理',
  'token.unreported': '未报告用量',
  'tool.none': '本次调用没有工具调用',
  'tool.running': '执行中',
  'tool.error': '失败',
  'empty.title': '暂无调用记录',
  'empty.description': '本会话还没有模型调用。',
  'loadOlder': '载入更早的调用',
  'loadOlder.pending': '正在载入…',
  'duration.ms': '{value} ms',
  'duration.s': '{value} s',
  'duration.minutes': '{minutes}m{seconds}s',
  'duration.unknown': '—',
} as const

/** The call-ledger dictionary key union. */
export type CallLedgerKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The complete call-ledger view copy. */
    callLedger: CallLedgerKey
  }
}

/** Namespace-bound translator threaded through call-ledger presentation code. */
export type CallLedgerTranslate =
  import('@deepseek-ai/dsh-client-ui-slots').TranslateNS<typeof NS>

/** English dictionary, checked complete against the Chinese source of truth. */
export const en: Record<CallLedgerKey, string> = {
  'view.calls': 'Workflow',
  'a11y.region': 'Workflow call ledger',
  'summary.turns': 'User turns',
  'summary.modelCalls': 'Model calls',
  'summary.toolCalls': 'Tool calls',
  'summary.elapsed': 'Elapsed',
  'turn.label': 'Turn {turn}',
  'turn.untitled': 'This session',
  'call.title': 'Model call #{index}',
  'call.status.running': 'Running',
  'call.status.complete': 'Completed',
  'call.status.error': 'Failed',
  'call.error': 'Error: {message}',
  'section.request': 'REQUEST',
  'section.response': 'RESPONSE',
  'section.tools': 'Tool calls',
  'request.model': 'Model',
  'request.unknownModel': 'Unknown model',
  'request.system': 'System',
  'request.messages': 'Messages',
  'request.toolDefinitions': 'Tool definitions',
  'response.empty': '(no content)',
  'response.reasoning': 'Reasoning',
  'response.content': 'Content',
  'response.toolCalls': 'Tool calls',
  'token.title': 'Tokens',
  'token.input': 'Input',
  'token.uncached': 'Uncached',
  'token.cached': 'Cache hits',
  'token.cacheWrite': 'Cache writes',
  'token.output': 'Output',
  'token.reasoning': 'Reasoning',
  'token.unreported': 'Usage not reported',
  'tool.none': 'This call made no tool calls',
  'tool.running': 'Running',
  'tool.error': 'Failed',
  'empty.title': 'No calls recorded',
  'empty.description': 'This session has no model calls yet.',
  'loadOlder': 'Load earlier calls',
  'loadOlder.pending': 'Loading…',
  'duration.ms': '{value} ms',
  'duration.s': '{value} s',
  'duration.minutes': '{minutes}m{seconds}s',
  'duration.unknown': '—',
}
