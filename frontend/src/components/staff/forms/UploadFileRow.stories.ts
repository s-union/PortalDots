import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UploadFileRow from './UploadFileRow.vue'
import type { StaffFormUpload } from '@/features/staff/forms/api'

const meta = {
  title: 'UI/Staff/Forms/UploadFileRow',
  component: UploadFileRow,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'highlight']
    }
  }
} satisfies Meta<typeof UploadFileRow>

export default meta
type Story = StoryObj<typeof meta>

const upload: StaffFormUpload = {
  id: 'upload-1',
  questionId: 'q-1',
  filename: 'activity-photo.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 204800,
  createdAt: '2026-01-15T10:00:00Z'
}

export const Default: Story = {
  args: {
    formId: 'form-1',
    upload,
    variant: 'default'
  }
}

export const Highlight: Story = {
  args: {
    formId: 'form-1',
    upload,
    variant: 'highlight'
  }
}

export const PdfFile: Story = {
  args: {
    formId: 'form-1',
    upload: {
      ...upload,
      id: 'upload-2',
      filename: 'application-form.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 512000
    },
    variant: 'default'
  }
}

export const LargeFile: Story = {
  args: {
    formId: 'form-1',
    upload: {
      ...upload,
      id: 'upload-3',
      filename: 'presentation-materials.zip',
      mimeType: 'application/zip',
      sizeBytes: 10485760
    },
    variant: 'default'
  }
}
