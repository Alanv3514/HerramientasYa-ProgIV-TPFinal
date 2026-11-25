import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { InicioPage } from './pages/InicioPage'

// Qué pantalla va en cada URL. Las tarjetas de cada módulo suman sus rutas acá.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InicioPage />} />
      </Routes>
    </BrowserRouter>
  )
}
