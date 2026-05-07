import { configureStore, createSlice } from '@reduxjs/toolkit'
import languageReducer from './languageSlice'

// 创建一个默认的 slice
const appSlice = createSlice({
  name: 'app',
  initialState: {
    initialized: false,
  },
  reducers: {
    setInitialized: (state) => {
      state.initialized = true
    },
  },
})

const store = configureStore({
  reducer: {
    app: appSlice.reducer,
    language: languageReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store
