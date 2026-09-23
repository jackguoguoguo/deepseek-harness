/**
 * ui-runstate browser half on a real SlotRegistry: the plugin registers the
 * run-state tab type and body, the header toggle, and the per-call review
 * badge; it folds `tool/*` and `approval/*` events into the `runstate`
 * Conversation target and exposes it through the `useRunstate` session hook.
 * Teardown removes every registration (HMR safety).
 */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { ConversationEventRegistry } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as nodeApply } from '../src/index.ts'
import { RunstateBody } from '../src/client/RunstateBody.tsx'
import { RunstateToggle } from '../src/client/RunstateToggle.tsx'
import { RunstateReviewBadge } from '../src/client/ReviewBadge.tsx'
import { NS, RUNSTATE_ID, RUNSTATE_KIND, en, zh } from '../src/client/locales.ts'
import { RUNSTATE_CALL_KIND, RUNSTATE_REVIEW_KIND } from '../src/client/contract.ts'

/** Stub the services `apply` reaches for; the real SlotRegistry owns `slots`. */
function provideSurface(ctx: Context) {
  const events = new ConversationEventRegistry(ctx)
  const viewsRegister = vi.fn(() => vi.fn())
  const binding = vi.fn(() => ({
    target: vi.fn(() => ({ subscribe: vi.fn(), getSnapshot: vi.fn(() => undefined) })),
  }))
  const registerType = vi.fn((_definition: Parameters<Context['sidebarRightTabs']['register']>[0]) => vi.fn())
  const openTab = vi.fn()
  const close = vi.fn()
  const active = vi.fn(() => undefined)
  ctx.provide('uiConversation', { events, views: { register: viewsRegister }, binding })
  const sessionProvide = vi.fn(() => vi.fn())
  ctx.provide('uiSession', { provide: sessionProvide })
  ctx.provide('sidebarRightTabs', { register: registerType })
  ctx.provide('sidebarRight', { active, openTab, close, isExpanded: vi.fn(), toggleExpanded: vi.fn(), focus: vi.fn(), split: vi.fn(), float: vi.fn(), dock: vi.fn(), openResource: vi.fn() })
  return { events, viewsRegister, binding, registerType, openTab, close, active, sessionProvide }
}

/** Boot the browser half over a slot tree that declares every occupied slot. */
async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'sidebar.right.pane.tab': { kind: 'keyed', scope: 'session' },
      'conversation.session.header.utilities': { kind: 'list', scope: 'session' },
      'tool.call.review': { kind: 'single', scope: 'session' },
    },
  } as never, () => null)
  ctx.provide('sessions', {})
  ctx.provide('locale', new LocaleRuntime(ctx))
  const surface = provideSurface(ctx)
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, fiber, ...surface }
}

describe('ui-runstate browser apply', () => {
  it('declares every service it binds', () => {
    expect(inject).toEqual(['slots', 'locale', 'uiSession', 'uiConversation', 'sidebarRight', 'sidebarRightTabs'])
  })

  it('node-half apply is an intentional no-op', () => {
    expect(() => { nodeApply() }).not.toThrow()
  })

  it('registers the tab type, body, header toggle, and review badge', async () => {
    const b = await bench()
    const type = b.registerType.mock.calls[0]![0]
    expect(type.id).toBe(RUNSTATE_ID)
    expect(type.kind).toBe(RUNSTATE_KIND)
    expect(type.guide?.[0]?.id).toBe(RUNSTATE_ID)

    expect(b.ctx.slots.entries('sidebar.right.pane.tab')[0]).toMatchObject({
      component: RunstateBody,
      options: { key: RUNSTATE_ID },
    })
    const header = b.ctx.slots.entries('conversation.session.header.utilities')[0]!
    expect(header.component).toBe(RunstateToggle)
    expect(header.options).toMatchObject({ id: RUNSTATE_ID, order: 50 })
    expect(b.ctx.slots.entries('tool.call.review')[0]).toMatchObject({ component: RunstateReviewBadge })
  })

  it('folds tool/* and approval/* into the runstate target and exposes useRunstate', async () => {
    const b = await bench()
    expect(b.events.entries().map(entry => entry.kind)).toEqual([RUNSTATE_CALL_KIND, RUNSTATE_REVIEW_KIND])
    expect(b.viewsRegister).toHaveBeenCalledWith(expect.objectContaining({ target: 'runstate' }))
    expect(b.sessionProvide).toHaveBeenCalledWith(expect.objectContaining({ hooks: ['runstate'] }))
  })

  it('header toggle registers as a session-scoped button with the run-state id', async () => {
    const b = await bench()
    const header = b.ctx.slots.entries('conversation.session.header.utilities')[0]!
    expect(header.options).toMatchObject({ id: RUNSTATE_ID, order: 50 })
    expect(header.component).toBe(RunstateToggle)
  })

  it('registers both dictionaries under its own namespace and releases them on teardown', async () => {
    const b = await bench()
    b.ctx.locale.setLocale('zh')
    const translate = b.ctx.locale.bind(NS)
    expect(translate('title')).toBe(zh.title)
    b.ctx.locale.setLocale('en')
    expect(translate('title')).toBe(en.title)
    await b.fiber.dispose()
    expect(translate('title')).not.toBe(en.title)
  })

  it('tears down every registration (HMR safety)', async () => {
    const b = await bench()
    await b.fiber.dispose()
    expect(b.ctx.slots.entries('sidebar.right.pane.tab')).toEqual([])
    expect(b.ctx.slots.entries('conversation.session.header.utilities').map(e => e.options.id)).not.toContain(RUNSTATE_ID)
    expect(b.ctx.slots.entries('tool.call.review')).toEqual([])
    expect(b.registerType).toHaveBeenCalledTimes(1)
  })
})

describe('ui-runstate dictionaries', () => {
  it('keeps the English key set identical to the Chinese source of truth', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })
})
