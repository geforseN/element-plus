<template>
  <el-button plain @click="addResettableNotification">
    Resettable notification
  </el-button>
  <el-button plain @click="addPauseableNotification">
    Pauseable notification
  </el-button>
</template>
<script lang="ts" setup>
import { ElNotification } from 'element-plus'

const addResettableNotification = () => {
  ElNotification({
    showProgressBar: true,
    title: 'Resettable, Hover me',
    message: 'Resets interval on mouseenter, starts interval on mouseleave',
    timerControls: 'reset-restart',
  })
}

const addPauseableNotification = () => {
  ElNotification({
    showProgressBar: true,
    title: 'Pauseable, Hover me',
    message: 'Pauses interval on mouseenter, resumes on mouseleave',
    timerControls: 'pause-resume',
  })
}
</script>
