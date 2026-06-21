<script setup>
import { computed, reactive, ref, watch } from 'vue'
import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElTag,
} from 'element-plus'
import { Document, Edit, Plus, Delete } from '@element-plus/icons-vue'
import { api } from '../lib/api'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  resource: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'refresh'])

const outlineLoading = ref(false)
const outline = ref(null)

watch(
  () => props.modelValue,
  async (v) => {
    if (v && props.resource) {
      await loadOutline()
    }
  }
)

watch(
  () => props.resource,
  async () => {
    if (props.modelValue && props.resource) {
      await loadOutline()
    }
  }
)

async function loadOutline() {
  if (!props.resource) return
  outlineLoading.value = true
  try {
    const resp = await api.get(`/actions/admin/course-outlines/${props.resource.resourceId}`)
    outline.value = resp.data.data
  } finally {
    outlineLoading.value = false
  }
}

function close() {
  emit('update:modelValue', false)
}

const editDialogOpen = ref(false)
const editMode = ref('create')
const editTargetType = ref('chapter')
const editParentId = ref(null)
const editTargetId = ref(null)
const editForm = reactive({
  title: '',
  description: '',
  sortOrder: 0,
})

function openCreateChapter() {
  editMode.value = 'create'
  editTargetType.value = 'chapter'
  editParentId.value = null
  editTargetId.value = null
  editForm.title = ''
  editForm.description = ''
  editForm.sortOrder = 0
  editDialogOpen.value = true
}

function openCreateSection(chapter) {
  editMode.value = 'create'
  editTargetType.value = 'section'
  editParentId.value = chapter.id
  editTargetId.value = null
  editForm.title = ''
  editForm.description = ''
  editForm.sortOrder = 0
  editDialogOpen.value = true
}

function openCreateKp(section) {
  editMode.value = 'create'
  editTargetType.value = 'kp'
  editParentId.value = section.id
  editTargetId.value = null
  editForm.title = ''
  editForm.description = ''
  editForm.sortOrder = 0
  editDialogOpen.value = true
}

function openEdit(type, raw) {
  editMode.value = 'edit'
  editTargetType.value = type
  editTargetId.value = raw.id
  editForm.title = raw.title || ''
  editForm.description = raw.description || ''
  editForm.sortOrder = Number(raw.sortOrder) || 0
  editDialogOpen.value = true
}

async function submitEditDialog() {
  if (!editForm.title.trim()) {
    ElMessage.warning('请填写标题')
    return
  }
  try {
    if (editMode.value === 'create') {
      if (editTargetType.value === 'chapter') {
        await api.post(`/actions/admin/course-outlines/${props.resource.resourceId}/chapters`, {
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          sortOrder: Number(editForm.sortOrder) || 0,
        })
      } else if (editTargetType.value === 'section') {
        await api.post(`/actions/admin/course-chapters/${editParentId.value}/sections`, {
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          sortOrder: Number(editForm.sortOrder) || 0,
        })
      } else if (editTargetType.value === 'kp') {
        await api.post(`/actions/admin/course-sections/${editParentId.value}/knowledge-points`, {
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          sortOrder: Number(editForm.sortOrder) || 0,
        })
      }
    } else {
      if (editTargetType.value === 'chapter') {
        await api.put(`/actions/admin/course-chapters/${editTargetId.value}`, {
          title: editForm.title.trim(),
          description: editForm.description !== undefined ? (editForm.description.trim() || null) : undefined,
          sortOrder: Number(editForm.sortOrder) || 0,
        })
      } else if (editTargetType.value === 'section') {
        await api.put(`/actions/admin/course-sections/${editTargetId.value}`, {
          title: editForm.title.trim(),
          description: editForm.description !== undefined ? (editForm.description.trim() || null) : undefined,
          sortOrder: Number(editForm.sortOrder) || 0,
        })
      } else if (editTargetType.value === 'kp') {
        await api.put(`/actions/admin/course-knowledge-points/${editTargetId.value}`, {
          title: editForm.title.trim(),
          description: editForm.description !== undefined ? (editForm.description.trim() || null) : undefined,
          sortOrder: Number(editForm.sortOrder) || 0,
        })
      }
    }
    editDialogOpen.value = false
    ElMessage.success(editMode.value === 'create' ? '已新增' : '已更新')
    await loadOutline()
    emit('refresh')
  } catch (e) {
    //
  }
}

async function deleteNode(type, raw) {
  const nameMap = { chapter: '章节', section: '小节', kp: '知识点' }
  const endpointMap = {
    chapter: `/actions/admin/course-chapters/${raw.id}`,
    section: `/actions/admin/course-sections/${raw.id}`,
    kp: `/actions/admin/course-knowledge-points/${raw.id}`,
  }
  await ElMessageBox.confirm(
    `确认删除该${nameMap[type]}？删除后下级内容也会一并移除。`,
    '删除确认',
    { type: 'warning' }
  )
  try {
    await api.delete(endpointMap[type])
    ElMessage.success('已删除')
    await loadOutline()
    emit('refresh')
  } catch (e) {
    //
  }
}
</script>

<template>
  <ElDialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :title="`课程大纲编辑 · ${resource?.name || ''}`"
    width="860px"
    destroy-on-close
  >
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px">
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
        <ElTag v-if="outline" size="small" type="info">
          {{ outline.chapters?.length || 0 }} 章
        </ElTag>
        <ElTag v-if="outline" size="small" type="success">
          {{ outline.chapters?.reduce((a, ch) => a + (ch.sections?.length || 0), 0) || 0 }} 节
        </ElTag>
        <ElTag v-if="outline" size="small" type="warning">
          {{
            outline.chapters?.reduce(
              (a, ch) => a + (ch.sections?.reduce((b, se) => b + (se.knowledgePoints?.length || 0), 0) || 0),
              0
            ) || 0
          }}
          知识点
        </ElTag>
      </div>
      <ElButton type="primary" @click="openCreateChapter">
        <Plus style="width: 14px; height: 14px; margin-right: 4px" />
        新增章节
      </ElButton>
    </div>

    <el-scrollbar style="max-height: 58vh">
      <div v-loading="outlineLoading" style="min-height: 200px">
        <div v-if="outline && outline.chapters && outline.chapters.length > 0">
          <div
            v-for="chapter in outline.chapters"
            :key="chapter.id"
            style="border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 12px; background: #fafbfc"
          >
            <div
              style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; gap: 10px; flex-wrap: wrap"
            >
              <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px">
                <ElTag type="primary" size="small" effect="light">章</ElTag>
                <span style="font-weight: 700">{{ chapter.title }}</span>
                <ElTag size="small" type="info" effect="plain">{{ chapter.sections?.length || 0 }} 节</ElTag>
                <span v-if="chapter.sortOrder !== undefined" style="font-size: 12px; color: #94a3b8">
                  排序: {{ chapter.sortOrder }}
                </span>
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap">
                <ElButton size="small" type="primary" plain @click="openCreateSection(chapter)">
                  <Plus style="width: 13px; height: 13px; margin-right: 2px" />
                  加节
                </ElButton>
                <ElButton size="small" @click="openEdit('chapter', chapter)">
                  <Edit style="width: 13px; height: 13px; margin-right: 2px" />
                  编辑
                </ElButton>
                <ElButton size="small" type="danger" plain @click="deleteNode('chapter', chapter)">
                  <Delete style="width: 13px; height: 13px; margin-right: 2px" />
                  删除
                </ElButton>
              </div>
            </div>
            <div v-if="chapter.description" style="padding: 0 14px 10px; font-size: 12px; color: #64748b">
              {{ chapter.description }}
            </div>

            <div style="padding: 0 14px 12px">
              <div
                v-for="section in chapter.sections"
                :key="section.id"
                style="border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; background: #fff"
              >
                <div
                  style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; gap: 8px; flex-wrap: wrap"
                >
                  <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 180px">
                    <ElTag type="success" size="small" effect="light">节</ElTag>
                    <span style="font-weight: 600">{{ section.title }}</span>
                    <ElTag size="small" type="warning" effect="plain">
                      {{ section.knowledgePoints?.length || 0 }} 知识点
                    </ElTag>
                    <span v-if="section.sortOrder !== undefined" style="font-size: 12px; color: #94a3b8">
                      排序: {{ section.sortOrder }}
                    </span>
                  </div>
                  <div style="display: flex; gap: 6px; flex-wrap: wrap">
                    <ElButton size="small" type="primary" plain @click="openCreateKp(section)">
                      <Plus style="width: 13px; height: 13px; margin-right: 2px" />
                      加知识点
                    </ElButton>
                    <ElButton size="small" @click="openEdit('section', section)">
                      <Edit style="width: 13px; height: 13px; margin-right: 2px" />
                      编辑
                    </ElButton>
                    <ElButton size="small" type="danger" plain @click="deleteNode('section', section)">
                      <Delete style="width: 13px; height: 13px; margin-right: 2px" />
                      删除
                    </ElButton>
                  </div>
                </div>
                <div v-if="section.description" style="padding: 0 12px 8px; font-size: 12px; color: #64748b">
                  {{ section.description }}
                </div>

                <div style="padding: 0 12px 10px">
                  <div
                    v-for="kp in section.knowledgePoints"
                    :key="kp.id"
                    style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border: 1px dashed #cbd5e1; border-radius: 6px; margin-bottom: 6px; background: #f8fafc"
                  >
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 150px">
                      <ElTag type="warning" size="small" effect="light">知</ElTag>
                      <span style="color: #334155">{{ kp.title }}</span>
                      <span v-if="kp.sortOrder !== undefined" style="font-size: 11px; color: #94a3b8">
                        排序: {{ kp.sortOrder }}
                      </span>
                    </div>
                    <div style="display: flex; gap: 6px">
                      <ElButton size="small" @click="openEdit('kp', kp)">
                        <Edit style="width: 12px; height: 12px; margin-right: 2px" />
                        编辑
                      </ElButton>
                      <ElButton size="small" type="danger" plain @click="deleteNode('kp', kp)">
                        <Delete style="width: 12px; height: 12px; margin-right: 2px" />
                        删除
                      </ElButton>
                    </div>
                  </div>
                  <div
                    v-if="!section.knowledgePoints || section.knowledgePoints.length === 0"
                    style="text-align: center; padding: 8px 0; font-size: 12px; color: #94a3b8"
                  >
                    暂无知识点，点击「加知识点」添加
                  </div>
                </div>
              </div>
              <div
                v-if="!chapter.sections || chapter.sections.length === 0"
                style="text-align: center; padding: 12px 0; font-size: 12px; color: #94a3b8"
              >
                暂无小节，点击「加节」添加
              </div>
            </div>
          </div>
        </div>
        <div v-else style="text-align: center; padding: 60px 0; color: #94a3b8; font-size: 13px">
          <Document style="width: 48px; height: 48px; margin: 0 auto 12px; color: #cbd5e1" />
          <div>暂无大纲内容，点击「新增章节」开始编排</div>
        </div>
      </div>
    </el-scrollbar>

    <template #footer>
      <ElButton @click="close">关闭</ElButton>
    </template>
  </ElDialog>

  <ElDialog
    v-model="editDialogOpen"
    :title="
      editMode === 'create'
        ? `新增${editTargetType === 'chapter' ? '章节' : editTargetType === 'section' ? '小节' : '知识点'}`
        : `编辑${editTargetType === 'chapter' ? '章节' : editTargetType === 'section' ? '小节' : '知识点'}`
    "
    width="500px"
    destroy-on-close
  >
    <ElForm label-width="80px">
      <ElFormItem label="标题" required>
        <ElInput v-model="editForm.title" maxlength="200" show-word-limit placeholder="请输入标题" />
      </ElFormItem>
      <ElFormItem label="说明">
        <ElInput
          v-model="editForm.description"
          type="textarea"
          :rows="3"
          maxlength="800"
          show-word-limit
          placeholder="可选：内容说明、学习目标等"
        />
      </ElFormItem>
      <ElFormItem label="排序">
        <ElInputNumber v-model="editForm.sortOrder" :min="0" :max="9999" style="width: 100%" />
        <div style="font-size: 12px; color: #94a3b8; margin-top: 4px">数值越小越靠前，留空则追加到末尾</div>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="editDialogOpen = false">取消</ElButton>
      <ElButton type="primary" @click="submitEditDialog">确认</ElButton>
    </template>
  </ElDialog>
</template>
