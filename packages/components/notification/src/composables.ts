import { computed, ref, watch } from 'vue'
import { clamp, resolveUnref as toValue, useIntervalFn } from '@vueuse/core'
import { debugWarn } from '@element-plus/utils'

import type { CSSProperties } from 'vue'
import type { MaybeRef } from '@vueuse/core'
import type { NotificationAction, NotificationProps } from './notification'
import type { ButtonProps } from '@element-plus/element-plus'

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
  onEnd: () => void
) {
  const remaining = ref(toValue(duration))
  watch(
    () => toValue(duration),
    (duration) => {
      remaining.value = duration
    }
  )

  let interval: ReturnType<typeof useIntervalFn> | undefined

  return {
    remaining,
    initialize() {
      const mustInitTimer = toValue(duration) > 0
      if (!mustInitTimer) return
      const MAGIC_NUMBER = computed(() =>
        clamp(toValue(duration) / 16.7, 10, 100)
      )
      interval = useIntervalFn(() => {
        remaining.value -= MAGIC_NUMBER.value
        if (remaining.value <= 0) {
          interval!.pause()
          onEnd()
        }
      }, MAGIC_NUMBER)
    },
    pauseOrReset() {
      if (!interval) return
      const mustResetRemaining = toValue(timerControls) === 'reset-restart'
      if (mustResetRemaining) {
        remaining.value = toValue(duration)
      }
      interval.pause()
    },
    resumeOrRestart() {
      if (!interval) return
      interval.resume()
    },
    cleanup() {
      if (!interval) return
      interval.pause()
    },
  }
}

export function useProgressBar(
  showProgressBar: MaybeRefOrGetter<NotificationProps['showProgressBar']>,
  duration: MaybeRefOrGetter<NotificationProps['duration']>,
  remaining: MaybeRefOrGetter<number>
) {
  return {
    mustShow: computed(() => toValue(showProgressBar) && toValue(duration) > 0),
    style: computed<CSSProperties>(() => {
      return {
        width: `${(toValue(remaining) / toValue(duration)) * 100}%`,
      }
    }),
  }
}

type IntervalNotificationAction = Required<
  Pick<NotificationAction, 'label' | 'execute' | 'button'>
>

export function useActions(
  actions: MaybeRefOrGetter<NotificationProps['actions']>,
  closeNotification: () => void
) {
  const actions_ = computed(() => {
    const actionsValue = toValue(actions)
    if (!actionsValue) {
      return []
    }
    const filteredActions = actionsValue
      .filter(
        (action) =>
          typeof action.execute === 'function' &&
          typeof action.label === 'string' &&
          action.label
      )
      .reduce((actions, action) => {
        const { label } = action
        if (!actions[label]) {
          const { keepOpen } = action
          const execute = !keepOpen
            ? () => {
                action.execute()
                closeNotification()
              }
            : keepOpen === 'until-resolved'
            ? async () => {
                await action.execute()
                closeNotification()
              }
            : action.execute
          const button = <ButtonProps>{ size: 'small', ...action.button }
          actions[label] = { label, execute, button }
        } else {
          debugWarn(
            'ElNotification',
            `Duplicated action label: \`${label}\`. Please change action label.`
          )
        }
        return actions
      }, {} as Record<string, IntervalNotificationAction>)

    return Object.values(filteredActions)
  })

  return {
    mustShow: computed(() => actions_.value.length > 0),
    actions: actions_,
  }
}
