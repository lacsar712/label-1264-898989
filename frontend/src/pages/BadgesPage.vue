<script setup>
import { ElRow, ElCol } from 'element-plus'
import BadgeGallery from '../components/BadgeGallery.vue'
import BadgeSummary from '../components/BadgeSummary.vue'

function scrollToGallery() {
  const el = document.getElementById('badge-gallery-section')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<template>
  <div style="padding: 16px 16px 22px">
    <ElRow :gutter="16">
      <ElCol :xs="24" :lg="8">
        <BadgeSummary @view-all="scrollToGallery" />
      </ElCol>

      <ElCol :xs="24" :lg="16">
        <div id="badge-gallery-section">
          <BadgeGallery />
        </div>
      </ElCol>
    </ElRow>
  </div>
</template>
