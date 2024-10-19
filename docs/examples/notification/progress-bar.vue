<template>
  <div>
    <el-button @click="addNotification()">No type</el-button>
    <el-button @click="addNotification({ type: 'success' })">Success</el-button>
  </div>
</template>
<script lang="ts" setup>
import { ElNotification, type NotificationOptions } from 'element-plus'

const addNotification = (notification: Partial<NotificationOptions> = {}) => {
  ElNotification({
    title: 'Progress Bar',
    duration: 5000,
    showProgressBar: true,
    ...notification,
  })
}
</script>
