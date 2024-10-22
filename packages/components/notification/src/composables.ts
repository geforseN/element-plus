import { computed, nextTick, ref, watch } from 'vue'
import { resolveUnref as toValue, useEventListener } from '@vueuse/core'
import { debugWarn } from '@element-plus/utils'

import type { Ref } from 'vue'
import type { MaybeComputedRef } from '@vueuse/core'
import type { ButtonProps } from '@element-plus/element-plus'
import type { Mutable } from '@element-plus/utils'
import type { NotificationAction, NotificationProps } from './notification'

export function useVisibility(initial: boolean) {
  const visible = ref(initial)

  return {
    visible,
    show() {
      visible.value = true
    },
    hide() {
      visible.value = false
    },
  }
}

function createProgressBarAnimation(duration: number, element: HTMLElement) {
  return new Animation(
    new KeyframeEffect(element, [{ width: '100%' }, { width: '0%' }], {
      duration,
      fill: 'forwards',
    })
  )
}

export function useProgressBar(
  showProgressBar: MaybeComputedRef<boolean>,
  duration: MaybeComputedRef<number>,
  mustReset: MaybeComputedRef<boolean>,
  templateRef: Ref<HTMLElement | undefined>,
  onEnd: () => void
) {
  let animation: Animation | undefined

  function initialize(duration_ = toValue(duration)) {
    const progressBar = templateRef.value
    if (!progressBar) return
    if (animation) {
      animation.cancel()
    }
    animation = createProgressBarAnimation(duration_, progressBar)
    useEventListener(animation, 'finish', () => {
      console.log('finish animation')
      onEnd()
    })
  }

  watch(() => toValue(duration), initialize)

  return {
    mustShow: computed(() => toValue(showProgressBar) && toValue(duration) > 0),
    initialize,
    pauseOrReset() {
      if (!animation) return
      const mustResetAnimation = toValue(mustReset)
      if (mustResetAnimation) {
        animation.currentTime = toValue(duration)
        animation.play()
      }
      animation.pause()
    },
    resume() {
      if (!animation) return
      animation.play()
    },
    cleanup() {
      if (!animation) return
      animation.cancel()
      animation = undefined
    },
  }
}

type IntervalNotificationAction = {
  label: string
  button: Partial<ButtonProps>
  disabled: Ref<boolean>
  onClick: (event: MouseEvent) => Promise<void>
}

export function useActions(
  actions: MaybeComputedRef<NotificationProps['actions']>,
  closeNotification: () => void
) {
  const actions_ = computed(() => {
    const actionsValue = toValue(actions)
    if (!actionsValue) {
      return []
    }
    const preparedActions = actionsValue
      .filter(
        (action) =>
          typeof action.execute === 'function' &&
          typeof action.label === 'string' &&
          action.label
      )
      .reduce((actions, action) => {
        const { label } = action
        if (!actions[label]) {
          actions[label] = makeAction(action, closeNotification)
        } else {
          debugWarn(
            'ElNotification',
            `Duplicated action label: \`${label}\`. Please change action label.`
          )
        }
        return actions
      }, {} as Record<string, IntervalNotificationAction>)

    return Object.values(preparedActions)
  })

  return {
    mustShow: computed(() => actions_.value.length > 0),
    actions: actions_,
  }
}

function makeAction(
  action: NotificationAction,
  closeNotification: () => void
): IntervalNotificationAction {
  const { keepOpen = false, disableWhilePending: disable = keepOpen !== true } =
    action
  const button = <Mutable<IntervalNotificationAction['button']>>{
    size: 'small',
    ...action.button,
  }

  const disabled = ref(button.disabled ?? false)

  return {
    label: action.label,
    button,
    disabled,
    async onClick() {
      console.log('onClick')
      try {
        // await nextTick()
        if (disabled.value) {
          return
        }
        console.log(disabled.value, 'action.execute')
        const maybePromise = action.execute()
        if (disable) {
          disabled.value = true
        }
        if (keepOpen === 'until-resolved') {
          await maybePromise
        }
        await nextTick()
      } finally {
        if (keepOpen !== true) {
          closeNotification()
        } else if (!disable) {
          disabled.value = false
        }
      }
    },
  }
}
