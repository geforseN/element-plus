import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { configMocks, mockAnimationsApi } from 'jsdom-testing-mocks'
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest'
import * as utils from '@element-plus/utils'
import {
  notificationActionKeepOpen,
  notificationTypes,
} from '../src/notification'
import Notification from '../src/notification.vue'

import type { VNode } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import type { EVENT_CODE } from '@element-plus/constants'
import type {
  NotificationAction,
  NotificationInstance,
  NotificationProps,
} from '../src/notification'

const AXIOM = 'Rem is the best girl'

const onClose = vi.fn()

const _mount = ({
  props,
  slots,
}: {
  props?: Partial<NotificationProps>
  slots?: Record<'default', () => string | VNode>
}) =>
  mount(
    <Notification {...{ onClose, ...props }} v-slots={slots} />
  ) as NotificationVueWrapper

const __mount = (props: Partial<NotificationProps>) => _mount({ props })

type NotificationVueWrapper = VueWrapper<InstanceType<typeof Notification>>

const isOpen = (wrapper: NotificationVueWrapper) => wrapper.vm.visible === true

const isClosed = (wrapper: NotificationVueWrapper) =>
  wrapper.vm.visible === false

const hasVisibility =
  (visibility: boolean) => (wrapper: NotificationVueWrapper) =>
    wrapper.vm.visible === visibility

describe('Notification.vue', () => {
  configMocks({
    afterEach,
    afterAll,
  })

  mockAnimationsApi()

  describe('render', () => {
    test('basic render test', () => {
      const wrapper = _mount({
        slots: {
          default: () => AXIOM,
        },
      })

      expect(wrapper.text()).toEqual(AXIOM)
      expect(wrapper).toSatisfy(isOpen)
      expect((wrapper.vm as any).iconComponent).toBeUndefined()
      expect((wrapper.vm as any).horizontalClass).toBe('right')
      expect((wrapper.vm as any).positionStyle).toEqual(
        expect.objectContaining({
          top: '0px',
        })
      )
    })

    test('should be able to render VNode', () => {
      const wrapper = _mount({
        slots: {
          default: () => <span class="text-node">{AXIOM}</span>,
        },
      })

      expect(wrapper.find('.text-node').exists()).toBe(true)
    })

    test('should be able to render raw HTML tag with dangerouslyUseHTMLString flag', () => {
      const tagClass = 'test-class'
      const HTMLWrapper = __mount({
        dangerouslyUseHTMLString: true,
        message: `<strong class=${tagClass}>${AXIOM}</strong>`,
      })

      expect(HTMLWrapper.find(`.${tagClass}`).exists()).toBe(true)
    })

    test('should not be able to render raw HTML tag without dangerouslyUseHTMLString flag', () => {
      const tagClass = 'test-class'
      const HTMLWrapper = __mount({
        dangerouslyUseHTMLString: false,
        message: `<strong class=${tagClass}>${AXIOM}</strong>`,
      })
      expect(HTMLWrapper.find(`.${tagClass}`).exists()).toBe(false)
    })

    test('should be able to render z-index style with zIndex flag', async () => {
      const wrapper = __mount({ zIndex: 9999 })
      await nextTick()
      expect((wrapper.vm as any).positionStyle).toEqual(
        expect.objectContaining({
          top: '0px',
          zIndex: 9999,
        })
      )
    })
  })

  describe('Notification.type', () => {
    test.for(notificationTypes)(
      "should be able to render typed notification when { type: '%s' }",
      (type) => {
        const wrapper = __mount({ type })
        expect(
          wrapper.findComponent(utils.TypeComponentsMap[type]).exists()
        ).toBe(true)
      }
    )

    test('should not be able to render invalid type icon', () => {
      const consoleWarn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => vi.fn)
      // @ts-expect-error
      const wrapper = __mount({ type: 'some-type' })
      expect(wrapper.find('.el-notification__icon').exists()).toBe(false)
      expect(consoleWarn).toHaveBeenCalled()
      consoleWarn.mockRestore()
    })
  })

  describe('event handlers', () => {
    test('should be able to close the notification by clicking close button', async () => {
      const onClose = vi.fn()
      const wrapper = _mount({
        slots: {
          default: () => AXIOM,
        },
        props: { onClose },
      })
      await nextTick()
      const closeBtn = wrapper.find('.el-notification__closeBtn')
      expect(closeBtn.exists()).toBe(true)
      await closeBtn.trigger('click')
      expect(onClose).toHaveBeenCalled()
    })

    test('should be able to close after duration', async () => {
      vi.useFakeTimers()
      const wrapper = __mount({ duration: 100 })
      vi.runAllTimers()
      vi.waitFor(() => {
        expect(wrapper).toSatisfy(isClosed)
      })
      vi.useRealTimers()
    })

    const findNotification = (wrapper: NotificationVueWrapper) =>
      wrapper.find('[role=alert]')

    test('should be able to prevent close itself when hover over', async () => {
      vi.useFakeTimers()
      const wrapper = __mount({ duration: 100 })
      vi.advanceTimersByTime(50)
      await findNotification(wrapper).trigger('mouseenter')
      vi.advanceTimersByTime(5000)
      expect(wrapper).toSatisfy(isOpen)
      await findNotification(wrapper).trigger('mouseleave')
      expect(wrapper).toSatisfy(isOpen)
      vi.runAllTimers()
      await vi.waitFor(() => {
        expect(wrapper).toSatisfy(isClosed)
      })
      vi.useRealTimers()
    })

    test.for([
      {
        timerControls: 'pause-resume' as const,
        isVisibleAtEnd: false,
        name: 'will be closed after multiple hovers when timerControls is pause-resume',
      },
      {
        timerControls: 'reset-restart' as const,
        isVisibleAtEnd: true,
        name: 'will be open after multiple hovers when timerControls is reset-restart',
      },
    ] as const)('$name', async ({ timerControls, isVisibleAtEnd }) => {
      vi.useFakeTimers()
      const wrapper = __mount({ duration: 100, timerControls })
      vi.advanceTimersByTime(50)
      await wrapper.find('[role=alert]').trigger('mouseenter')
      await wrapper.find('[role=alert]').trigger('mouseleave')
      vi.advanceTimersByTime(50)
      await vi.waitFor(() => {
        expect(wrapper).toSatisfy(hasVisibility(isVisibleAtEnd))
      })
      vi.runAllTimers()
      await vi.waitFor(() => {
        expect(wrapper).toSatisfy(isClosed)
      })
      vi.useRealTimers()
    })

    test('should not be able to close when duration is set to 0', async () => {
      vi.useFakeTimers()
      const wrapper = __mount({ duration: 0 })
      vi.runAllTimers()
      expect(wrapper).toSatisfy(isOpen)
      vi.useRealTimers()
    })

    test('should be able to handle click event', async () => {
      const onClick = vi.fn()
      const wrapper = __mount({ duration: 0, onClick })
      await wrapper.trigger('click')
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    const keydown = (code: typeof EVENT_CODE[keyof typeof EVENT_CODE]) =>
      new KeyboardEvent('keydown', { code })

    test('should be able to delete timer when press delete', async () => {
      vi.useFakeTimers()
      const wrapper = _mount({
        slots: {
          default: () => AXIOM,
        },
      })
      document.dispatchEvent(keydown('Backspace'))
      vi.runAllTimers()
      expect(wrapper).toSatisfy(isOpen)
      vi.useRealTimers()
    })

    test('should be able to close the notification immediately when press esc', async () => {
      vi.useFakeTimers()
      const wrapper = _mount({
        props: {
          duration: 0,
        },
        slots: {
          default: () => AXIOM,
        },
      })
      document.dispatchEvent(keydown('Escape'))
      vi.runAllTimers()
      expect(wrapper).toSatisfy(isClosed)
      vi.useRealTimers()
    })
  })

  describe('progress bar', () => {
    const findProgressBar = (wrapper: VueWrapper<NotificationInstance>) =>
      wrapper.find('.el-notification__progressBar')

    describe.each<{
      hidden: '' | undefined
      name: string
      cases: Partial<NotificationProps>[]
    }>([
      {
        hidden: '',
        name: 'will be hidden',
        cases: [
          ...[-4500, 0, 4500].map((duration) => ({
            showProgressBar: false,
            duration,
          })),
          ...[-4500, 0].map((duration) => ({
            showProgressBar: true,
            duration,
          })),
        ],
      },
      {
        hidden: undefined,
        name: 'will be visible',
        cases: [
          {
            showProgressBar: true,
            duration: 4500,
          },
        ],
      },
    ])('$name', ({ cases, hidden: expected }) => {
      test.for(cases)('with %o', (props) => {
        const wrapper = __mount(props)
        expect(findProgressBar(wrapper).attributes('hidden')).toBe(expected)
      })
    })

    describe('background-color', () => {
      test.for(notificationTypes)(
        "has element class and type class with { type: '%s' }",
        (type) => {
          const wrapper = __mount({ type, showProgressBar: true })
          expect(findProgressBar(wrapper).classes()).toEqual([
            'el-notification__progressBar',
            `el-notification--${type}`,
          ])
        }
      )

      test.for([{}, { type: '' }, { type: undefined }] as const)(
        'has only element class with %o',
        (base) => {
          const wrapper = __mount({ ...base, showProgressBar: true })
          expect(findProgressBar(wrapper).classes()).toEqual([
            'el-notification__progressBar',
          ])
        }
      )
    })

    test('will be visible when duration changes', async () => {
      vi.useFakeTimers()
      const wrapper = __mount({
        duration: 100,
        showProgressBar: true,
      })
      vi.advanceTimersByTime(100 / 2)
      expect(findProgressBar(wrapper).attributes('hidden')).toBeUndefined()
      wrapper.setProps({ duration: 200 })
      vi.advanceTimersByTime(200 * 0.9)
      expect(findProgressBar(wrapper).attributes('hidden')).toBeUndefined()
      expect(wrapper).toSatisfy(isOpen)
      await vi.waitFor(() => {
        expect(wrapper).toSatisfy(isClosed)
      })
      vi.useRealTimers()
    })
  })

  describe('actions', () => {
    const findActions = (wrapper: VueWrapper<NotificationInstance>) =>
      wrapper.find('.el-notification__actions')

    const validActions: NotificationAction[] = [
      { label: 'test', execute: () => undefined },
    ]

    test.for([{}, { actions: undefined }, { actions: [] }])(
      'does not render with: %o',
      (props) => {
        const wrapper = __mount(props)
        expect(findActions(wrapper).exists()).toBe(false)
      }
    )

    test.for([{ actions: validActions }])('does render with: %o', (props) => {
      const wrapper = __mount(props)
      expect(findActions(wrapper).exists()).toBe(true)
    })

    describe('required action properties not passed', () => {
      const invalidActions = [
        { label: 'test' },
        { execute: () => undefined },
      ] as unknown as NotificationAction[]

      test('does not render invalid actions: %o', () => {
        const wrapper = __mount({ actions: invalidActions })
        expect(findActions(wrapper).exists()).toBe(false)
      })

      test('will render only valid action', () => {
        const wrapper = __mount({
          actions: [...invalidActions, ...validActions],
        })
        expect(findAllActionButtons(wrapper)).toHaveLength(validActions.length)
      })
    })

    test('calls debugWarn on duplicate label', () => {
      const debugWarn = vi
        .spyOn(utils, 'debugWarn')
        .mockImplementation(() => undefined)
      __mount({
        actions: [
          { label: 'test', execute: () => undefined },
          { label: 'test', execute: () => undefined },
        ],
      })
      expect(debugWarn).toMatchInlineSnapshot(`
        [MockFunction debugWarn] {
          "calls": [
            [
              "ElNotification",
              "Duplicated action label: \`test\`. Please change action label.",
            ],
          ],
          "results": [
            {
              "type": "return",
              "value": undefined,
            },
          ],
        }
      `)
      debugWarn.mockRestore()
    })

    describe('with same label', () => {
      const execute = vi.fn()
      const missedExecute = vi.fn()
      // NOTE: debugWarn spy removes console warning
      const debugWarn = vi
        .spyOn(utils, 'debugWarn')
        .mockImplementation(() => undefined)
      const wrapper = __mount({
        actions: [
          { label: 'test', execute },
          { label: 'test', execute: missedExecute },
        ],
      })

      test('will be one action button', () => {
        expect(findAllActionButtons(wrapper)).toHaveLength(1)
      })

      test('on click will execute first action', async () => {
        await wrapper.get('button').trigger('click')
        expect(execute).toHaveBeenCalled()
        expect(missedExecute).not.toHaveBeenCalled()
      })
      debugWarn.mockRestore()
    })

    const getActionButton = (wrapper: VueWrapper<NotificationInstance>) =>
      findActions(wrapper).get('button')

    const findAllActionButtons = (wrapper: VueWrapper<NotificationInstance>) =>
      findActions(wrapper).findAll('button')

    describe('button', () => {
      // NOTE: ElButton has `default` as default size, but action button uses `small` as default
      const defaultSizeClass = 'el-button--small'

      describe('omit `onclick` properties (case insensitive)', () => {
        test.for(['onClick', 'onclick', 'OnClicK'])(
          'calls `execute`, not button[%s]',
          async (name) => {
            const button = { [name]: vi.fn() }
            const execute = vi.fn()
            const wrapper = __mount({
              actions: [{ execute, label: 'Default', button }],
            })
            await getActionButton(wrapper).trigger('click')
            expect(execute).toHaveBeenCalled()
            expect(button[name]).not.toHaveBeenCalled()
          }
        )
      })

      describe('default (property is not provided)', () => {
        const wrapper = __mount({
          actions: [{ execute: utils.NOOP, label: 'Default' }],
        })
        const button = getActionButton(wrapper)

        test('does contain default size class', () => {
          expect(button.classes()).toContain(defaultSizeClass)
        })

        test('matches snapshot', () => {
          expect(button.html()).toMatchInlineSnapshot(`
            "<button ariadisabled="false" type="button" class="el-button el-button--small">
              <!--v-if--><span class="">Default</span>
            </button>"
          `)
        })
      })

      describe('custom with default size', () => {
        const wrapper = __mount({
          actions: [
            {
              label: 'Custom props',
              execute: utils.NOOP,
              button: { type: 'primary' },
            },
          ],
        })
        const button = getActionButton(wrapper)

        test('does contain default size class', () => {
          expect(button.classes()).toContain(defaultSizeClass)
        })

        test('matches snapshot', () => {
          expect(button.html()).toMatchInlineSnapshot(`
            "<button ariadisabled="false" type="button" class="el-button el-button--primary el-button--small">
              <!--v-if--><span class="">Custom props</span>
            </button>"
          `)
        })
      })

      describe('custom with custom size', () => {
        const wrapper = __mount({
          actions: [
            {
              execute: utils.NOOP,
              button: { type: 'primary', size: 'default' },
              label: 'Custom props with custom size',
            },
          ],
        })
        const button = getActionButton(wrapper)

        test('does not contain default size class', () => {
          expect(button.classes()).not.toContain(defaultSizeClass)
        })

        test('does contain custom size class', () => {
          expect(button.classes()).toContain('el-button--default')
        })

        test('matches snapshot', () => {
          expect(button.html()).toMatchInlineSnapshot(`
            "<button ariadisabled="false" type="button" class="el-button el-button--primary el-button--default">
              <!--v-if--><span class="">Custom props with custom size</span>
            </button>"
          `)
        })
      })
    })

    describe('keepOpen', () => {
      test.for(
        [{}, { keepOpen: false }, { keepOpen: undefined }].map((base) => [
          {
            ...base,
            label: 'Close',
            execute: utils.NOOP,
          },
        ])
      )('does close the notification with: %o', async (actions) => {
        const wrapper = __mount({ actions, duration: 0 })
        expect(wrapper).toSatisfy(isOpen)
        await getActionButton(wrapper).trigger('click')
        expect(wrapper).toSatisfy(isClosed)
      })

      test('does close the notification with { keepOpen: "until-resolved" }', async () => {
        const TIMEOUT = 100
        const execute = vi.fn(
          () => new Promise<void>((resolve) => setTimeout(resolve, TIMEOUT))
        )
        const wrapper = __mount({
          actions: [
            {
              label: `Close after ${TIMEOUT}ms`,
              execute,
              keepOpen: 'until-resolved',
            },
          ],
          duration: 0,
        })
        expect(wrapper).toSatisfy(isOpen)
        expect(execute).not.toHaveBeenCalled()
        await getActionButton(wrapper).trigger('click')
        expect(execute).toHaveBeenCalled()
        expect(execute).not.toHaveResolved()
        await vi.waitFor(() => {
          expect(wrapper).toSatisfy(isClosed)
        })
        expect(execute).toHaveResolved()
      })

      test('does not close the notification with { keepOpen: true }', async () => {
        const wrapper = __mount({
          actions: [
            { label: 'Keep open', keepOpen: true, execute: utils.NOOP },
          ],
          duration: 0,
        })
        expect(wrapper).toSatisfy(isOpen)
        await getActionButton(wrapper).trigger('click')
        expect(wrapper).toSatisfy(isOpen)
      })
    })

    describe('disableAfterExecute', () => {
      const MAGIC_NUMBER = 3
      if (MAGIC_NUMBER <= 1 || !Number.isInteger(MAGIC_NUMBER)) {
        throw new Error('MAGIC_NUMBER must be an integer greater than 1')
      }

      const actions = [
        {},
        ...notificationActionKeepOpen.map((keepOpen) => ({ keepOpen })),
      ] as { keepOpen: NotificationAction['keepOpen'] }[]

      const withDisableAfterExecute =
        (disableAfterExecute: boolean) =>
        (action: Partial<NotificationAction>) => ({
          disableAfterExecute,
          ...action,
        })

      describe.each([
        {
          expectedExecutionsCount: 1,
          name: 'run execute once on many clicks',
          cases: [
            actions.map(withDisableAfterExecute(true)),
            actions.filter((action) => action.keepOpen !== true),
          ].flat(),
        },
        {
          expectedExecutionsCount: MAGIC_NUMBER,
          name: 'run execute on every click',
          cases: [
            actions.find((action) => action.keepOpen === true),
            actions.map(withDisableAfterExecute(false)),
          ].flat(),
        },
      ] as const)('$name', ({ cases, expectedExecutionsCount }) => {
        test.for(cases)('with %o', (optionalProps) => {
          const execute = vi.fn()
          const wrapper = __mount({
            actions: [
              {
                label: `Action`,
                execute,
                ...optionalProps,
              },
            ],
            duration: 0,
          })
          const button = getActionButton(wrapper)
          for (let i = 0; i < MAGIC_NUMBER; i++) {
            button.trigger('click')
          }
          expect(execute).toHaveBeenCalledTimes(expectedExecutionsCount)
        })
      })
    })
  })
})
