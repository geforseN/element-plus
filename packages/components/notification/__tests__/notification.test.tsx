import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import { TypeComponentsMap } from '@element-plus/utils'
import { EVENT_CODE } from '@element-plus/constants'
import { notificationTypes } from '../src/notification'
import Notification from '../src/notification.vue'

import type { VNode } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import type { MockInstance } from 'vitest'
import type {
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
}) => mount(<Notification {...{ onClose, ...props }} v-slots={slots} />)

describe('Notification.vue', () => {
  describe('render', () => {
    test('basic render test', () => {
      const wrapper = _mount({
        slots: {
          default: () => AXIOM,
        },
      })

      expect(wrapper.text()).toEqual(AXIOM)
      expect(wrapper.vm.visible).toBe(true)
      expect(wrapper.vm.iconComponent).toBeUndefined()
      expect(wrapper.vm.horizontalClass).toBe('right')
      expect(wrapper.vm.positionStyle).toEqual(
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

      expect(wrapper.vm.positionStyle).toEqual(
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

      expect(wrapper.vm.visible).toBe(false)
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
      expect(wrapper.vm.visible).toBe(true)

      await wrapper.find('[role=alert]').trigger('mouseleave')
      expect(wrapper.vm.visible).toBe(true)
      vi.runAllTimers()
      expect(wrapper.vm.visible).toBe(false)
      vi.useRealTimers()
    })

    test.for([
      ['pause-resume', false],
      ['reset-restart', true],
    ] as const)(
      'handle timerControls=%s',
      async ([timerControls, isVisibleAtEnd]) => {
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
        expect(wrapper.vm.visible).toBe(isVisibleAtEnd)
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
      expect(wrapper.vm.visible).toBe(true)
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
      expect(wrapper.vm.visible).toBe(true)
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
      expect(wrapper.vm.visible).toBe(false)
      vi.useRealTimers()
    })
  })

  describe('progress bar', () => {
    const findProgressBar = (wrapper: VueWrapper<NotificationInstance>) =>
      wrapper.find('.el-notification__progressBar')

    describe.each<{
      mustRenderProgressBar: boolean
      name: string
      cases: Partial<NotificationProps>[]
    }>([
      {
        mustRenderProgressBar: false,
        name: 'will not render',
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
        mustRenderProgressBar: true,
        name: 'will render',
        cases: [
          {
            showProgressBar: true,
            duration: 4500,
          },
        ],
      },
    ])('$name', ({ cases, mustRenderProgressBar: expected }) => {
      test.for(cases)('when props: %o', (props) => {
        const wrapper = _mount({ props })
        expect(findProgressBar(wrapper).exists()).toBe(expected)
      })
    })

    describe.todo('background-color', () => {
      test.todo('when type provided')
      test.todo('no type then currentColor')
    })
  })

  describe('actions', () => {
    const findActions = (wrapper: VueWrapper<NotificationInstance>) =>
      wrapper.find('.el-notification__actions')

    describe.each<{
      mustRenderActions: boolean
      name: string
      cases: Partial<NotificationProps>[]
    }>([
      {
        mustRenderActions: false,
        name: 'will not render',
        cases: [
          { actions: undefined },
          { actions: [] },
          // some property is not provided
          { actions: [{ label: 'test' }] } as any,
          { actions: [{ execute: () => undefined }] } as any,
          // labels are same
          {
            actions: [
              { label: 'test', execute: () => undefined },
              { label: 'test', execute: () => undefined },
            ],
          },
        ],
      },
      {
        mustRenderActions: true,
        name: 'will render',
        cases: [
          {
            actions: [
              {
                label: 'test',
                execute: () => undefined,
              },
            ],
          },
        ],
      },
    ])('$name', ({ cases, mustRenderActions: expected }) => {
      test.for(cases)('when props: %o', (props) => {
        const wrapper = _mount({ props })
        expect(findActions(wrapper).exists()).toBe(expected)
      })
    })

    test.todo('spy action execute')
  })
})
