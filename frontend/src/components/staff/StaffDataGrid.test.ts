import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StaffDataGrid, { type StaffDataGridColumn } from './StaffDataGrid.vue'

const columns: StaffDataGridColumn[] = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: '名前', sortable: true },
  { key: 'verified', label: '確認' }
]

const rows = [
  { id: 'user-1', name: 'Alice', verified: true },
  { id: 'user-2', name: 'Bob', verified: false }
]

describe('StaffDataGrid', () => {
  it('renders toolbar, rows, and action slots', () => {
    const wrapper = mount(StaffDataGrid, {
      props: {
        rows,
        columns,
        page: 1,
        pageSize: 20,
        total: 2
      },
      slots: {
        toolbar: '<div>CSVで出力</div>',
        actions: '<template #actions><button type="button">編集</button></template>'
      }
    })

    expect(wrapper.text()).toContain('CSVで出力')
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Bob')
    expect(wrapper.text()).toContain('編集')
  })

  it('emits sort and navigation events', async () => {
    const wrapper = mount(StaffDataGrid, {
      props: {
        rows,
        columns,
        page: 2,
        pageSize: 20,
        total: 100
      }
    })

    const headerButtons = wrapper.findAll('thead button')
    await headerButtons[0].trigger('click')
    expect(wrapper.emitted('sort')).toEqual([['id']])

    const pagerButtons = wrapper.findAll('.grid-controls__button')
    await pagerButtons[0].trigger('click')
    await pagerButtons[1].trigger('click')
    await pagerButtons[2].trigger('click')
    await pagerButtons[3].trigger('click')
    await pagerButtons[4].trigger('click')

    expect(wrapper.emitted('first')).toBeTruthy()
    expect(wrapper.emitted('prev')).toBeTruthy()
    expect(wrapper.emitted('next')).toBeTruthy()
    expect(wrapper.emitted('last')).toBeTruthy()
    expect(wrapper.emitted('reload')).toBeTruthy()
  })

  it('emits update:pageSize and shows empty message', async () => {
    const wrapper = mount(StaffDataGrid, {
      props: {
        rows: [],
        columns,
        page: 1,
        pageSize: 20,
        total: 0,
        emptyMessage: 'データなし'
      }
    })

    expect(wrapper.text()).toContain('データなし')

    const pageSizeSelect = wrapper.get('select')
    await pageSizeSelect.setValue('50')
    expect(wrapper.emitted('update:pageSize')).toEqual([[50]])
  })
})
