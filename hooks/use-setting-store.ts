import data from '@/lib/data'
import { ClientSetting } from '@/lib/db/modules/setting'
import { create } from 'zustand'

interface SettingState {
  setting: ClientSetting
  setSetting: (s: ClientSetting) => void
}

const useSettingStore = create<SettingState>((set) => ({
  setting: { ...data.settings[0] } as ClientSetting,
  setSetting: (s) => set({ setting: s }),
}))

export default useSettingStore
