import { Navigate, Route, Routes } from 'react-router-dom'

import AccountPicker from './pages/AccountPicker'
import Cabinet from './pages/Cabinet'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AccountPicker />} />
      <Route path="/u/:personaId" element={<Cabinet />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
