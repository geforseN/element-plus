import { computed, ref } from 'vue'
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

export function useProgressBar(
  showProgressBar: MaybeComputedRef<NotificationProps['showProgressBar']>,
  duration: MaybeComputedRef<NotificationProps['duration']>,
  timerControls: MaybeComputedRef<NotificationProps['timerControls']>,
  templateRef: Ref<HTMLElement | undefined>,
  onEnd: () => void
) {
  let animation: Animation | undefined

  return {
    mustShow: computed(() => toValue(showProgressBar) && toValue(duration) > 0),
    initialize() {
      const progressBar = templateRef.value
      if (!progressBar) return
      animation = new Animation(
        new KeyframeEffect(progressBar, [{ width: '100%' }, { width: '0%' }], {
          duration: toValue(duration),
          fill: 'forwards',
        })
      )
      useEventListener(animation, 'finish', onEnd)
      animation.play()
    },
    pause() {
      if (!animation) return
      const mustResetRemaining = toValue(timerControls) === 'reset-restart'
      if (mustResetRemaining) {
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
  onClick: () => Promise<void>
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
  const {
    keepOpen = false,
    disableWhilePending = keepOpen === 'until-resolved',
  } = action

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
      try {
        if (disableWhilePending) {
          disabled.value = true
        }
        const maybePromise = action.execute()
        if (keepOpen === 'until-resolved') {
          await maybePromise
        }
      } finally {
        if (disableWhilePending) {
          disabled.value = false
        }
        if (keepOpen !== true) {
          closeNotification()
        }
      }
    },
  }
}
