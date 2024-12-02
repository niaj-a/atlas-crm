import { AuthScreen } from './AuthScreen';
import { Dashboard } from './Dashboard';
import { useAppSelector } from './store';
import './styles.css';

export default function App() {
  const token = useAppSelector((state) => state.auth.token);
  return token ? <Dashboard /> : <AuthScreen />;
}
