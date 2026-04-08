import { Routes, Route } from 'react-router-dom';
import Hub from './pages/Hub';
import GamePage from './pages/GamePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Hub />} />
      <Route path="/play/:slug" element={<GamePage />} />
    </Routes>
  );
}
