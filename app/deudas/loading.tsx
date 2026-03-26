import { RefreshCw } from 'lucide-react';

export default function DeudasLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p>Cargando módulo de deudas...</p>
      </div>
    </div>
  );
}

