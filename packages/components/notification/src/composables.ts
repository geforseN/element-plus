import { computed, reactive, ref } from 'vue'
import { resolveUnref as toValue, useTimeoutFn } from '@vueuse/core'
import { debugWarn } from '@element-plus/utils'

import type { Ref } from 'vue'
import type { MaybeRef } from '@vueuse/core'
import type { ButtonProps } from '@element-plus/element-plus'
import type { Mutable } from '@element-plus/utils'
import type { NotificationAction, NotificationProps } from './notification'

type MaybeRefOrGetter<T> = MaybeRef<T> | (() => T)

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

export function useTimer(
  duration: MaybeRefOrGetter<NotificationProps['duration']>,
  timerControls: MaybeRefOrGetter<NotificationProps['timerControls']>,
  onEnd: () => void,
  progressBarRef: Ref<HTMLElement | undefined>
) {
  let timeout: ReturnType<typeof useTimeoutFn>
  const remaining = ref(0)

  return {
    initialize() {
      const mustInitTimer = toValue(duration) > 0
      if (!mustInitTimer) return
      remaining.value = toValue(duration)
      timeout = useTimeoutFn(onEnd, remaining)
    },
    pauseOrReset(animation: Animation) {
      if (!timeout || !progressBarRef.value) return
      timeout.stop()
      const mustResetRemaining = toValue(timerControls) === 'reset-restart'
      if (mustResetRemaining) {
        return animation.reverse()
      }
      const elapsed = Number(animation.currentTime)
      if (!elapsed) {
        throw new Error(
          `Expected animation.currentTime to be a number, got ${elapsed}`
        )
      }
      remaining.value = toValue(duration) - elapsed
    },
    resumeOrRestart() {
      if (!timeout) return
      timeout.start()
    },
    cleanup() {
      if (!timeout) return
      timeout.stop()
    },
  }
}

export function useProgressBar(
  showProgressBar: MaybeRefOrGetter<NotificationProps['showProgressBar']>,
  duration: MaybeRefOrGetter<NotificationProps['duration']>,
  templateRef: Ref<HTMLElement | undefined>
) {
  let animation: Animation | undefined

  return {
    mustShow: computed(() => toValue(showProgressBar) && toValue(duration) > 0),
    getAnimation() {
      return animation
    },
    initialize() {
      const progressBar = templateRef.value
      if (!progressBar) return
      animation = new Animation(
        new KeyframeEffect(progressBar, [{ width: '100%' }, { width: '0%' }], {
          duration: toValue(duration),
          fill: 'forwards',
        })
      )
      animation.play()
    },
    pause() {
      if (animation) {
        animation.pause()
      }
    },
    resume() {
      if (animation) {
        animation.play()
      }
    },
    cleanup() {
      if (animation) {
        animation.cancel()
        animation = undefined
      }
    },
  }
}

type IntervalNotificationAction = {
  label: string
  button: Partial<ButtonProps> & { onClick: () => Promise<void> }
}

export function useActions(
  actions: MaybeRefOrGetter<NotificationProps['actions']>,
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
          const button = makeActionButton(action, closeNotification)
          actions[label] = { label, button: button.props }
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

function makeActionButton(
  action: NotificationAction,
  closeNotification: () => void
) {
  const {
    keepOpen = false,
    disableWhilePending = keepOpen === 'until-resolved',
    execute,
  } = action

  const props = <IntervalNotificationAction['button']>{
    size: 'small',
    ...action.button,
    async onClick() {
      try {
        button.disableIfNeeded()
        const maybePromise = execute()
        if (keepOpen === 'until-resolved') {
          await maybePromise
        }
      } finally {
        button.enableIfNeeded()
        if (keepOpen !== true) {
          closeNotification()
        }
      }
    },
  }

  const button = disableWhilePending
    ? new ReactiveActionButton(props)
    : new NoopActionButton(props)
  return button
}

class NoopActionButton {
  constructor(public props: Mutable<IntervalNotificationAction['button']>) {}
  /* eslint-disable @typescript-eslint/no-empty-function */
  disableIfNeeded() {}
  enableIfNeeded() {}
  /* eslint-enable @typescript-eslint/no-empty-function */
}

class ReactiveActionButton {
  props: Mutable<IntervalNotificationAction['button']>

  constructor(props: Mutable<IntervalNotificationAction['button']>) {
    this.props = reactive(props)
  }

  disableIfNeeded() {
    this.props.disabled = true
  }

  enableIfNeeded() {
    this.props.disabled = false
  }
}
