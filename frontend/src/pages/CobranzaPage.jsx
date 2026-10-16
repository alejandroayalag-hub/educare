import { useState } from 'react';
import TabEstadoCuenta  from '../components/cobranza/TabEstadoCuenta';
import TabCargos        from '../components/cobranza/TabCargos';
import TabCaja          from '../components/cobranza/TabCaja';
import TabConceptos     from '../components/cobranza/TabConceptos';

const TABS = [
  { key: 'caja',          label: 'Caja del día' },
  { key: 'estado-cuenta', label: 'Estado de cuenta' },
  { key: 'cargos',        label: 'Cargos masivos' },
  { key: 'conceptos',     label: 'Conceptos de pago' },
];

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
        active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}>
      {label}
    </button>
  );
}

export default function CobranzaPage() {
  const [tab, setTab] = useState('caja');
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Cobranza</h1>
        <p className="text-sm text-gray-500 mt-1">Gestión de pagos, cargos y caja</p>
      </div>
      <div className="border-b border-gray-200 mb-6 flex gap-1 overflow-x-auto">
        {TABS.map(t => <TabBtn key={t.key} label={t.label} active={tab===t.key} onClick={() => setTab(t.key)} />)}
      </div>
      {tab === 'caja'          && <TabCaja />}
      {tab === 'estado-cuenta' && <TabEstadoCuenta />}
      {tab === 'cargos'        && <TabCargos />}
      {tab === 'conceptos'     && <TabConceptos />}
    </div>
  );
}
