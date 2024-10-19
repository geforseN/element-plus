<template>
  <el-button plain @click="noMessageNotification">
    No message, different actions
  </el-button>
  <el-button plain @click="foo">foo</el-button>
</template>

<script lang="ts" setup>
import { ElNotification } from 'element-plus'

const foo = () => {
  ElNotification({
    actions: [
      // {
      //   execute: () => undefined,
      //   label: 'Will not be closed',
      //   keepOpen: true,
      // },
      {
        label: 'Will be closed',
        execute: () => new Promise((resolve) => setTimeout(resolve, 1000)),
        keepOpen: 'until-resolved',
      },
      {
        label: 'Foo',
        execute: () => new Promise((resolve) => setTimeout(resolve, 1000)),
      },
    ],
    duration: 0,
  })
}

// const addItemDeletedNotification = () => {
//   ElNotification({
//     title: 'Item Deleted',
//     message: 'But you can restore it',
//     actions: [
//       {
//         label: 'Restore item',
//         execute() {
//           ElNotification({
//             title: 'Item Restored',
//             message: 'But you can delete it again',
//             actions: [
//               { label: 'Delete item', execute: addItemDeletedNotification },
//             ],
//           })
//         },
//       },
//     ],
//   })
// }

const noMessageNotification = () => {
  return ElNotification({
    title: 'Title',
    showProgressBar: true,
    actions: [
      { label: 'Close', execute: () => undefined },
      { label: 'Keep open', execute: () => undefined, keepOpen: true },
      {
        label: 'Open until resolved',
        execute: () => new Promise((resolve) => setTimeout(resolve, 1000)),
        keepOpen: 'until-resolved',
      },
    ],
  })
}
</script>
