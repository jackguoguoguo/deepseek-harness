/** `tokenStats` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'chart.aria': '每步输入输出 Token 柱状图，共 {count} 次',
  'chart.tooltip': '输入 {input} · 输出 {output}',
  'chart.pair': '第 {count} 次：输入 {input}，输出 {output}',
  'tokens.input': '输入',
  'tokens.output': '输出',
  'number.thousand': '{value}K',
  'number.million': '{value}M',
} satisfies Record<string, string>

/** Token-statistics dictionary key union. */
export type TokenStatsKey = keyof typeof zh

/** English dictionary, checked complete against the Chinese key set. */
export const en = {
  'chart.aria': 'Per-step input/output token chart, {count} steps',
  'chart.tooltip': 'Input {input} · Output {output}',
  'chart.pair': 'Step {count}: {input} input, {output} output',
  'tokens.input': 'Input',
  'tokens.output': 'Output',
  'number.thousand': '{value}K',
  'number.million': '{value}M',
} satisfies Record<TokenStatsKey, string>
