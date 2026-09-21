/**
 * Browser-half lifecycle over the real SlotRegistry: the dictionary and
 * composer-dock slot registrations with fiber teardown proving removal (HMR safety).
 */

import { Context } from '@deepseek-ai/cordis'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'
import { TokenStatsMeter } from '../src/client/TokenStatsMeter.tsx'
import { en, zh } from '../src/client/locales.ts'
import { apply as nodeApply } from '../src/index.ts'

afterEach(() => {
  vi.restoreAllMocks()
})

/** Boot the browser half over a real slot tree that declares the composer-dock list. */
async function bench(): Promise<{ ctx: Context; fiber: ReturnType<Context['plugin']> }> {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'conversation.composer.dock': { kind: 'list', scope: 'session' },
    },
  } as never, () => null)
  ctx.provide('sessions', {})
  ctx.provide('locale', new LocaleRuntime(ctx))
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, fiber }
}

function dockEntryIds(ctx: Context): (string | undefined)[] {
  return ctx.slots.entries('conversation.composer.dock').map(entry => entry.options.id)
}

describe('ui-token-stats browser half', () => {
  it('declares the services it binds', () => {
    expect(inject).toEqual(['sessions', 'slots', 'locale'])
  })

  it('registers the composer-dock widget, and fiber teardown removes it (HMR safety)', async () => {
    const { ctx, fiber } = await bench()
    const entry = ctx.slots.entries('conversation.composer.dock')[0]
    expect(entry?.component).toBe(TokenStatsMeter)
    expect(entry?.options).toMatchObject({ id: 'token-stats', order: -10 })
    await fiber.dispose()
    expect(dockEntryIds(ctx)).not.toContain('token-stats')
  })

  it('registers both dictionaries under its own namespace and releases them with the fiber', async () => {
    const { ctx, fiber } = await bench()
    ctx.locale.setLocale('zh')
    const translate = ctx.locale.bind('tokenStats')
    expect(translate('tokens.input')).toBe(zh['tokens.input'])
    ctx.locale.setLocale('en')
    expect(translate('tokens.input')).toBe(en['tokens.input'])
    await fiber.dispose()
    expect(translate('tokens.input')).not.toBe(en['tokens.input'])
  })

  it('keeps the English dictionary key-identical to the Chinese source of truth', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })
})

describe('ui-token-stats node half', () => {
  it('the node apply is an inert loader seat', () => {
    expect(() => { nodeApply() }).not.toThrow()
  })
})
