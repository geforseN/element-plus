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
      @mouseenter="clearTimer"
      @mouseleave="startTimer"
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
        <div v-if="actions?.length" :class="ns.e('actions')">
          <el-button
            v-for="action in actions"
            :key="action.label"
            size="small"
            @click="action.execute"
          >
            {{ action.label }}
          </el-button>
        </div>
        <el-icon v-if="showClose" :class="ns.e('closeBtn')" @click.stop="close">
          <Close />
        </el-icon>
      </div>
      <div
        v-if="showProgressBar && props.duration > 0"
        :class="ns.e('progressBar')"
        style="
          height: 6px;
          position: absolute;
          bottom: 0;
          left: 0;
          transition: width 0.1s;
          background-color: brown;
        "
        :style="{
          width: `${(remaining / props.duration) * 100}%`,
          backgroundColor: props.type
            ? `var(--el-color-${props.type})`
            : `currentColor`,
        }"
      />
    </div>
  </transition>
</template>
<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useEventListener, useTimeoutFn } from '@vueuse/core'
import { CloseComponents, TypeComponentsMap } from '@element-plus/utils'
import { EVENT_CODE } from '@element-plus/constants'
import { ElIcon } from '@element-plus/components/icon'
import { ElButton } from '@element-plus/components/button'
import { useGlobalComponentSettings } from '@element-plus/components/config-provider'
import { notificationEmits, notificationProps } from './notification'

import type { CSSProperties } from 'vue'

defineOptions({
  name: 'ElNotification',
})

const props = defineProps(notificationProps)
defineEmits(notificationEmits)

const { ns, zIndex } = useGlobalComponentSettings('notification')
const { nextZIndex, currentZIndex } = zIndex

const { Close } = CloseComponents

const visible = ref(false)
const remaining = ref(props.duration)
let stop: (() => void) | undefined = undefined

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

function startTimer() {
  if (props.duration > 0) {
    ;({ stop } = useTimeoutFn(() => {
      if (visible.value) close()
    }, props.duration))
  }
}

function clearTimer() {
  stop?.()
}

function close() {
  visible.value = false
}

function onKeydown({ code }: KeyboardEvent) {
  if (code === EVENT_CODE.delete || code === EVENT_CODE.backspace) {
    clearTimer() // press delete/backspace clear timer
  } else if (code === EVENT_CODE.esc) {
    // press esc to close the notification
    if (visible.value) {
      close()
    }
  } else {
    startTimer() // resume timer
  }
}

let interval: ReturnType<typeof setInterval>
onMounted(() => {
  if (props.duration >= 0 && props.showProgressBar) {
    interval = setInterval(() => {
      remaining.value -= 100
    }, 100)
  }
  startTimer()
  nextZIndex()
  visible.value = true
})

onUnmounted(() => {
  clearInterval(interval)
})

useEventListener(document, 'keydown', onKeydown)

defineExpose({
  visible,
  /** @description close notification */
  close,
})
</script>
