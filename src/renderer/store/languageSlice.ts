import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface LanguageState {
  current: 'en' | 'zh'
}

const initialState: LanguageState = {
  current: (localStorage.getItem('appLanguage') as 'en' | 'zh') || 'zh',
}

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<'en' | 'zh'>) => {
      state.current = action.payload
      localStorage.setItem('appLanguage', action.payload)
    },
  },
})

export const { setLanguage } = languageSlice.actions
export default languageSlice.reducer
