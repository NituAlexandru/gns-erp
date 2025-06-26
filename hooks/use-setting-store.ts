import data from '@/lib/data'
import { create } from 'zustand'
import { ClientSetting } from '@/types'

interface SettingState {
  setting: ClientSetting
  setSetting: (s: ClientSetting) => void
}

const useSettingStore = create<SettingState>((set) => ({
  setting: { ...data.settings[0] } as ClientSetting,
  setSetting: (s) => set({ setting: s }),
}))

export default useSettingStore
