<template>
  <transition
    :name="ns.b('fade')"
    @before-leave="onClose"
    @after-leave="$emit('destroy')"
  >
    <div
      v-show="visible"
      :id="id"
      :class="[ns.b(), customClass, horizontalClass]"
      :style="positionStyle"
      role="alert"
      @mouseenter="pauseOrReset"
      @mouseleave="resumeOrRestart"
      @click="onClick"
    >
      <el-icon v-if="iconComponent" :class="[ns.e('icon'), typeClass]">
        <component :is="iconComponent" />
      </el-icon>
      <div :class="ns.e('group')">
        <h2 :class="ns.e('title')" v-text="title" />
        <div
          v-show="message"
          :class="ns.e('content')"
          :style="!!title ? undefined : { margin: 0 }"
        >
          <slot>
            <p v-if="!dangerouslyUseHTMLString">{{ message }}</p>
            <!-- Caution here, message could've been compromised, never use user's input as message -->
            <p v-else v-html="message" />
          </slot>
        </div>
        <div v-if="mustShowActions" :class="ns.e('actions')">
          <el-button
            v-for="action of actions"
            :key="action.label"
            v-bind="action.button"
          >
            {{ action.label }}
          </el-button>
        </div>
        <el-icon v-if="showClose" :class="ns.e('closeBtn')" @click.stop="close">
          <Close />
        </el-icon>
      </div>
      <div
        v-if="progressBar.mustShow.value"
        ref="progressBarRef"
        :class="[ns.e('progressBar'), typeClass]"
      />
    </div>
  </transition>
</template>
<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { CloseComponents, TypeComponentsMap } from '@element-plus/utils'
import { EVENT_CODE } from '@element-plus/constants'
import { ElIcon } from '@element-plus/components/icon'
import { ElButton } from '@element-plus/components/button'
import { useGlobalComponentSettings } from '@element-plus/components/config-provider'
import { notificationEmits, notificationProps } from './notification'
import {
  useActions,
  useProgressBar,
  useTimer,
  useVisibility,
} from './composables'

import type { CSSProperties } from 'vue'

defineOptions({
  name: 'ElNotification',
})

const props = defineProps(notificationProps)
defineEmits(notificationEmits)

const { visible, show: open, hide: close } = useVisibility(false)

const onClose = () => {
  timer.cleanup()
  progressBar.cleanup()
  props.onClose?.()
}

const progressBarRef = ref<HTMLElement>()
const timer = useTimer(
  () => props.duration,
  () => props.timerControls,
  () => {
    if (visible.value) {
      close()
    }
  },
  progressBarRef
)

const progressBar = useProgressBar(
  () => props.showProgressBar,
  () => props.duration,
  progressBarRef
)

const { actions, mustShow: mustShowActions } = useActions(
  () => props.actions,
  close
)

const pauseOrReset = () => {
  const animation = progressBar.getAnimation()
  if (!animation) {
    throw new Error('Animation not found')
  }
  timer.pauseOrReset(animation)
  progressBar.pause()
}

const resumeOrRestart = () => {
  timer.resumeOrRestart()
  progressBar.resume()
}

const { ns, zIndex } = useGlobalComponentSettings('notification')
const { nextZIndex, currentZIndex } = zIndex

const { Close } = CloseComponents

const typeClass = computed(() => {
  const type = props.type
  return type && TypeComponentsMap[props.type] ? ns.m(type) : ''
})

const iconComponent = computed(() => {
  if (!props.type) return props.icon
  return TypeComponentsMap[props.type] || props.icon
})

const horizontalClass = computed(() =>
  props.position.endsWith('right') ? 'right' : 'left'
)

const verticalProperty = computed(() =>
  props.position.startsWith('top') ? 'top' : 'bottom'
)

const positionStyle = computed<CSSProperties>(() => {
  return {
    [verticalProperty.value]: `${props.offset}px`,
    zIndex: props.zIndex ?? currentZIndex.value,
  }
})

useEventListener(document, 'keydown', ({ code }: KeyboardEvent) => {
  if (code === EVENT_CODE.delete || code === EVENT_CODE.backspace) {
    pauseOrReset()
  } else if (code === EVENT_CODE.esc) {
    close()
  } else {
    resumeOrRestart()
  }
})

onMounted(() => {
  timer.initialize()
  progressBar.initialize()
  nextZIndex()
  open()
})

defineExpose({
  visible,
  /** @description close notification */
  close,
})
</script>
