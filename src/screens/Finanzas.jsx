import React from 'react'
import { FinanzasIngresos } from './FinanzasIngresos.jsx'
import { FinanzasGastos }   from './FinanzasGastos.jsx'
import { FinanzasFiscal }   from './FinanzasFiscal.jsx'

export function Finanzas() {
  const [tab, setTab] = React.useState('ingresos')

  const link = (id, label) => (
    <button
      key={id}
      className={`fin-subnav__link${tab === id ? ' fin-subnav__link--on' : ''}`}
      onClick={() => setTab(id)}
    >{label}</button>
  )

  return (
    <div className="fin-page">
      <nav className="fin-subnav">
        {link('ingresos', 'Ingresos')}
        {link('gastos',   'Gastos')}
        {link('fiscal',   'Fiscal')}
      </nav>
      {tab === 'ingresos' && <FinanzasIngresos />}
      {tab === 'gastos'   && <FinanzasGastos />}
      {tab === 'fiscal'   && <FinanzasFiscal />}
    </div>
  )
}
