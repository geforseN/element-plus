import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { configMocks, mockAnimationsApi } from 'jsdom-testing-mocks'
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest'
import { TypeComponentsMap } from '@element-plus/utils'
import * as utils from '@element-plus/utils'
import { EVENT_CODE } from '@element-plus/constants'
import { notificationTypes } from '../src/notification'
import Notification from '../src/notification.vue'

import type { VNode } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import type { MockInstance } from 'vitest'
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

type NotificationVueWrapper = VueWrapper<InstanceType<typeof Notification>>

const isOpen = (wrapper: NotificationVueWrapper) => wrapper.vm.visible === true

const isClosed = (wrapper: NotificationVueWrapper) =>
  wrapper.vm.visible === false

const hasVisibility =
  (visibility: boolean) => (wrapper: NotificationVueWrapper) =>
    wrapper.vm.visible === visibility

configMocks({
  afterEach,
  afterAll,
})

mockAnimationsApi()

describe('Notification.vue', () => {
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
      const HTMLWrapper = _mount({
        props: {
          dangerouslyUseHTMLString: true,
          message: `<strong class=${tagClass}>${AXIOM}</strong>`,
        },
      })

      expect(HTMLWrapper.find(`.${tagClass}`).exists()).toBe(true)
    })

    test('should not be able to render raw HTML tag without dangerouslyUseHTMLString flag', () => {
      const tagClass = 'test-class'
      const HTMLWrapper = _mount({
        props: {
          dangerouslyUseHTMLString: false,
          message: `<strong class=${tagClass}>${AXIOM}</strong>`,
        },
      })

      expect(HTMLWrapper.find(`.${tagClass}`).exists()).toBe(false)
    })

    test('should be able to render z-index style with zIndex flag', async () => {
      const wrapper = _mount({
        props: {
          zIndex: 9999,
        },
      })
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
    test('should be able to render typed notification', () => {
      let wrapper: VueWrapper<NotificationInstance>

      for (const type of notificationTypes) {
        wrapper = _mount({
          props: {
            type,
          },
        })
        expect(wrapper.findComponent(TypeComponentsMap[type]).exists()).toBe(
          true
        )
      }
    })

    test('should not be able to render invalid type icon', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => vi.fn)

      const type = 'some-type'
      const wrapper = _mount({
        props: {
          // @ts-expect-error
          type,
        },
      })

      expect(wrapper.find('.el-notification__icon').exists()).toBe(false)
      expect(console.warn).toHaveBeenCalled()
      ;(console.warn as any as MockInstance).mockRestore()
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
      const duration = 100
      const wrapper = _mount({
        props: {
          duration,
        },
      })
      vi.runAllTimers()
      vi.useRealTimers()
      vi.waitFor(() => {
        expect(wrapper).toSatisfy(isClosed)
      })
    })

    test('should be able to prevent close itself when hover over', async () => {
      vi.useFakeTimers()
      const duration = 100
      const wrapper = _mount({
        props: {
          duration,
        },
      })
      vi.advanceTimersByTime(50)

      await wrapper.find('[role=alert]').trigger('mouseenter')
      vi.advanceTimersByTime(5000)
      expect(wrapper).toSatisfy(isOpen)
      await wrapper.find('[role=alert]').trigger('mouseleave')
      expect(wrapper).toSatisfy(isOpen)
      vi.runAllTimers()
      await vi.waitFor(() => {
        expect(wrapper).toSatisfy(isClosed)
      })
      vi.useRealTimers()
    })

    test.for([
      { timerControls: 'pause-resume', isVisibleAtEnd: false },
      { timerControls: 'reset-restart', isVisibleAtEnd: true },
    ] as const)(
      'handle timerControls=%s',
      async ({ timerControls, isVisibleAtEnd }) => {
        vi.useFakeTimers()
        const duration = 100
        const wrapper = _mount({
          props: {
            duration,
            timerControls,
          },
        })
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
      }
    )

    test('should not be able to close when duration is set to 0', async () => {
      vi.useFakeTimers()
      const duration = 0
      const wrapper = _mount({
        props: {
          duration,
        },
      })

      vi.runAllTimers()
      expect(wrapper).toSatisfy(isOpen)
      vi.useRealTimers()
    })

    test('should be able to handle click event', async () => {
      const onClick = vi.fn()
      const wrapper = _mount({
        props: {
          duration: 0,
          onClick,
        },
      })

      await wrapper.trigger('click')
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    test('should be able to delete timer when press delete', async () => {
      vi.useFakeTimers()
      const wrapper = _mount({
        slots: {
          default: () => AXIOM,
        },
      })

      const event = new KeyboardEvent('keydown', {
        code: EVENT_CODE.backspace,
        bubbles: true,
      })
      document.dispatchEvent(event)

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

      // Same as above
      const event = new KeyboardEvent('keydown', {
        code: EVENT_CODE.esc,
      })

      document.dispatchEvent(event)
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
      test.for(cases)('when props: %o', (props) => {
        const wrapper = _mount({ props })
        expect(findProgressBar(wrapper).attributes('hidden')).toBe(expected)
      })
    })

    describe('background-color', () => {
      test.for(notificationTypes)(
        'has element class and type class when type prop is %s',
        (type) => {
          const wrapper = _mount({
            props: {
              type,
              showProgressBar: true,
            },
          })
          expect(findProgressBar(wrapper).classes()).toEqual([
            'el-notification__progressBar',
            `el-notification--${type}`,
          ])
        }
      )

      test.for([{}, { type: '' }, { type: undefined }] as const)(
        'has only element class when props contains %o',
        (props) => {
          const wrapper = _mount({
            props: {
              ...props,
              showProgressBar: true,
            },
          })

          expect(findProgressBar(wrapper).classes()).toEqual([
            'el-notification__progressBar',
          ])
        }
      )
    })

    test('will be visible when duration changes', async () => {
      vi.useFakeTimers()
      const initialDuration = 100
      const wrapper = _mount({
        props: { duration: initialDuration, showProgressBar: true },
      })
      vi.advanceTimersByTime(initialDuration / 2)
      expect(findProgressBar(wrapper).attributes('hidden')).toBeUndefined()
      const higherDuration = initialDuration * 2
      wrapper.setProps({ duration: higherDuration })
      vi.advanceTimersByTime(higherDuration * 0.9)
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

    const validAction = { label: 'test', execute: () => undefined }

    test.for([{}, { actions: undefined }, { actions: [] }])(
      'does not render when props: %o',
      (props) => {
        const wrapper = _mount({ props })
        expect(findActions(wrapper).exists()).toBe(false)
      }
    )

    test.for([{ actions: [validAction] }])(
      'does render when props: %o',
      (props) => {
        const wrapper = _mount({ props })
        expect(findActions(wrapper).exists()).toBe(true)
      }
    )

    describe('required action properties not passed', () => {
      const invalidActions = [
        { label: 'test' },
        { execute: () => undefined },
      ] as unknown as NonNullable<NotificationProps['actions']>

      test('does not render invalid actions: %o', () => {
        const wrapper = _mount({ props: { actions: invalidActions } })
        expect(findActions(wrapper).exists()).toBe(false)
      })

      test('will render only valid action', () => {
        const wrapper = _mount({
          props: { actions: invalidActions.concat(validAction) },
        })
        expect(findActions(wrapper).findAll('button').length).toBe(1)
      })
    })

    test('calls debugWarn on duplicate label', () => {
      const debugWarn = vi
        .spyOn(utils, 'debugWarn')
        .mockImplementation(() => undefined)

      _mount({
        props: {
          actions: [
            { label: 'test', execute: () => undefined },
            { label: 'test', execute: () => undefined },
          ],
        },
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

      const wrapper = _mount({
        props: {
          actions: [
            { label: 'test', execute },
            { label: 'test', execute: missedExecute },
          ],
        },
      })

      test('will be one action button', () => {
        expect(findActions(wrapper).findAll('button').length).toBe(1)
      })

      test('on click will execute first action', async () => {
        await wrapper.get('button').trigger('click')
        expect(execute).toHaveBeenCalled()
        expect(missedExecute).not.toHaveBeenCalled()
      })
      debugWarn.mockRestore()
    })

    describe('button', () => {
      const defaultSizeClass = 'el-button--small'

      const getActionButton = (wrapper: VueWrapper<NotificationInstance>) =>
        findActions(wrapper).get('button')

      describe('disallow onclick', () => {
        test.for(['onClick', 'onclick', 'OnClicK'])(
          'calls `execute`, not button[%s]',
          async (name) => {
            const button = {
              [name]: vi.fn(),
            }
            const execute = vi.fn()
            const wrapper = _mount({
              props: {
                actions: [
                  {
                    execute,
                    label: 'Default',
                    button,
                  },
                ],
              },
            })
            await getActionButton(wrapper).trigger('click')
            expect(execute).toHaveBeenCalled()
            expect(button[name]).not.toHaveBeenCalled()
          }
        )
      })

      describe('default', () => {
        const wrapper = _mount({
          props: {
            actions: [
              {
                execute: () => undefined,
                label: 'Default',
              },
            ],
          },
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
        const wrapper = _mount({
          props: {
            actions: [
              {
                execute: () => undefined,
                button: {
                  type: 'primary',
                },
                label: 'Custom props',
              },
            ],
          },
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
        const wrapper = _mount({
          props: {
            actions: [
              {
                execute: () => undefined,
                button: {
                  type: 'primary',
                  size: 'default',
                },
                label: 'Custom props with custom size',
              },
            ],
          },
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
      test.for([{}, { keepOpen: false }, { keepOpen: undefined }])(
        'does close the notification with: %o',
        async (action) => {
          const wrapper = _mount({
            props: {
              actions: [
                {
                  label: 'Close',
                  execute: () => undefined,
                  ...action,
                },
              ],
              duration: 0,
            },
          })
          expect(wrapper).toSatisfy(isOpen)
          await findActions(wrapper).get('button').trigger('click')
          expect(wrapper).toSatisfy(isClosed)
        }
      )

      test('does not close the notification with { keepOpen: true }', async () => {
        const wrapper = _mount({
          props: {
            actions: [
              {
                execute: () => undefined,
                label: 'Keep open',
                keepOpen: true,
              },
            ],
            duration: 0,
          },
        })

        expect(wrapper).toSatisfy(isOpen)
        await findActions(wrapper).get('button').trigger('click')
        expect(wrapper).toSatisfy(isOpen)
      })

      test('does close the notification with { keepOpen: "until-resolved" }', async () => {
        const TIMEOUT = 100
        const execute = vi.fn(
          () => new Promise<void>((resolve) => setTimeout(resolve, TIMEOUT))
        )
        const wrapper = _mount({
          props: {
            actions: [
              {
                label: `Close after ${TIMEOUT}ms`,
                execute,
                keepOpen: 'until-resolved',
              },
            ],
            duration: 0,
          },
        })
        expect(wrapper).toSatisfy(isOpen)
        expect(execute).not.toHaveBeenCalled()
        await findActions(wrapper).get('button').trigger('click')
        expect(execute).toHaveBeenCalled()
        expect(execute).not.toHaveResolved()
        await vi.waitFor(() => {
          expect(wrapper).toSatisfy(isClosed)
        })
        expect(execute).toHaveResolved()
      })
    })

    describe('disableAfterExecute', () => {
      const MAGIC_NUMBER = 3
      if (MAGIC_NUMBER <= 1 || !Number.isInteger(MAGIC_NUMBER)) {
        throw new Error('MAGIC_NUMBER must be an integer greater than 1')
      }

      const keepOpenValues: NotificationAction['keepOpen'][] = [
        undefined,
        false,
        true,
        'until-resolved',
      ] as const

      const actionsWithAllKeepOpenValues = [
        {},
        ...keepOpenValues.map((keepOpen) => ({ keepOpen })),
      ] as const

      const testActionCallsCount = (
        action: Pick<NotificationAction, 'keepOpen' | 'disableAfterExecute'>,
        expectedTimes: number
      ) => {
        const execute = vi.fn()
        const wrapper = _mount({
          props: {
            actions: [
              {
                execute,
                label: 'X',
                ...action,
              },
            ],
            duration: 0,
          },
        })
        const button = findActions(wrapper).get('button')
        for (let i = 0; i < MAGIC_NUMBER; i++) {
          button.trigger('click')
        }
        expect(execute).toHaveBeenCalledTimes(expectedTimes)
      }

      describe('when true', () => {
        test.for(
          actionsWithAllKeepOpenValues.map((action) => ({
            ...action,
            disableAfterExecute: true,
          }))
        )('will run execute once on every click with: %o', (action) =>
          testActionCallsCount(action, 1)
        )
      })

      describe('when not provided', () => {
        test.for(
          actionsWithAllKeepOpenValues.filter(
            // @ts-expect-error Property 'keepOpen' does not exist on type '{}'.ts(2339)
            (action) => action.keepOpen !== true
          )
        )('will run execute once on many clicks with: %o', (action) =>
          testActionCallsCount(action, 1)
        )

        test('will run execute on every click with: { keepOpen: true }', () =>
          testActionCallsCount({ keepOpen: true }, MAGIC_NUMBER))
      })

      describe('when false', () => {
        test.for(
          actionsWithAllKeepOpenValues.map((action) => ({
            ...action,
            disableAfterExecute: false,
          }))
        )('will run execute on every click with: %o', (action) =>
          testActionCallsCount(action, MAGIC_NUMBER)
        )
      })
    })
  })
})
