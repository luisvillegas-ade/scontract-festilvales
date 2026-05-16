import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

const CONTRACT_ADDRESS = "0x7f174cd2a62aE9FaB508cdd8F31edC1a3981f0b1"
const SNOWTRACE_BASE = "https://testnet.snowtrace.io/address/"

const CONTRACT_TEMPLATES = [
  { 
    id: 'standard', 
    name: 'Show Festivalero Estándar (Salta)', 
    text: `CONTRATO DE LOCACIÓN DE SERVICIOS ARTÍSTICOS\n\nEn la Ciudad de Salta, entre la Municipalidad y el Artista {{name}} (DNI {{dni}}), con domicilio en {{direccion}}, se conviene:\n\n1. OBJETO: El artista realizará una presentación en vivo.\n2. MONTO: {{amount}} AVAX.\n3. RETENCIONES: 3.6% AE y 1.2% Sellos (4.8% Total).\n4. PAGO: Vía Smart Contract Avalanche.`
  },
  { 
    id: 'private', 
    name: 'Evento Privado / Corporativo', 
    text: `CONTRATO PRIVADO DE ACTUACIÓN\n\nEntre la Productora y el Artista {{name}}, se acuerda la suma de {{amount}} AVAX.\nRetenciones fiscales provinciales (4.8%).`
  }
]

export default function App() {
  const [account, setAccount] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'productora' | 'artista' | 'control'>('productora')
  const [loading, setLoading] = useState(false)
  const [txStatus, setTxStatus] = useState<string | null>(null)
  const [showFullContract, setShowFullContract] = useState(false)

  // DB Data
  const [artists, setArtists] = useState<any[]>([])
  const [isRegistered, setIsRegistered] = useState(false)
  const [artistProfile, setArtistProfile] = useState<any>(null)
  const [userContracts, setUserContracts] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [rejectingContractId, setRejectingContractId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [allContracts, setAllContracts] = useState<any[]>([])

  // Espectaculos state
  const [espectaculos, setEspectaculos] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [activeShow, setActiveShow] = useState<any>(null)
  const [showContractModal, setShowContractModal] = useState(false)
  
  const [newShow, setNewShow] = useState({
    nombre: '',
    provincia: 'Salta',
    anio: new Date().getFullYear().toString(),
    presupuesto: '',
    descripcion: ''
  })
  const [filters, setFilters] = useState({
    anio: '',
    provincia: '',
    presupuesto: ''
  })

  // Registration Form State
  const [regForm, setRegForm] = useState({ name: '', dni: '', cuit: '', direccion: '' })

  // Contract Form State
  const [selectedArtist, setSelectedArtist] = useState<any>(null)
  const [selectedTemplate, setSelectedTemplate] = useState(CONTRACT_TEMPLATES[0])
  const [amount, setAmount] = useState('0.01') 
  
  const split = {
    total: parseFloat(amount) || 0,
    taxAE: (parseFloat(amount) || 0) * 0.036,
    taxSellos: (parseFloat(amount) || 0) * 0.012,
    net: (parseFloat(amount) || 0) * 0.952
  }

  const generatedText = selectedTemplate.text
    .replace('{{name}}', selectedArtist?.name || '...')
    .replace('{{dni}}', selectedArtist?.dni || '...')
    .replace('{{direccion}}', selectedArtist?.direccion || '...')
    .replace('{{amount}}', amount)

  // ─── EFFECTS ───
  useEffect(() => { 
    fetchArtists() 
    fetchEspectaculos()
  }, [])
  useEffect(() => { 
    if (account) {
      checkUserRegistration(account)
      fetchAllContracts()
    }
  }, [account])

  // ─── ACTIONS ───
  const connectWallet = async () => {
    if (!window.ethereum) return alert("Instalá MetaMask")
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    setAccount(accounts[0])
  }

  const fetchArtists = async () => {
    const { data, error } = await supabase.from('artistas').select('*')
    if (!error && data) setArtists(data)
  }

  const checkUserRegistration = async (wallet: string) => {
    const { data } = await supabase.from('artistas').select('*').eq('wallet', wallet.toLowerCase()).single()
    if (data) {
      setArtistProfile(data)
      setRegForm({ name: data.name, dni: data.dni, cuit: data.cuit, direccion: data.direccion })
      setIsRegistered(true)
      fetchUserContracts(wallet)
    } else {
      setIsRegistered(false)
      setRegForm({ name: '', dni: '', cuit: '', direccion: '' })
    }
  }

  const fetchUserContracts = async (wallet: string) => {
    const { data } = await supabase
      .from('contratos')
      .select('*')
      .eq('artist_wallet', wallet.toLowerCase())
      .order('created_at', { ascending: false })
    if (data) setUserContracts(data)
  }

  const fetchAllContracts = async () => {
    const { data } = await supabase
      .from('contratos')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setAllContracts(data)
  }

  const fetchEspectaculos = async () => {
    const { data, error } = await supabase
      .from('espectaculos')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setEspectaculos(data)
  }

  const handleCreateShow = async () => {
    if (!account) return alert("Conecta tu wallet primero")
    if (!newShow.nombre || !newShow.presupuesto) return alert("Completa los datos obligatorios")
    
    setLoading(true)
    const { error } = await supabase.from('espectaculos').insert({
      nombre: newShow.nombre,
      provincia: newShow.provincia,
      anio: parseInt(newShow.anio),
      presupuesto: parseFloat(newShow.presupuesto),
      descripcion: newShow.descripcion,
      empresa_wallet: account.toLowerCase(),
      imagen_url: `https://loremflickr.com/400/300/concert?lock=${Math.floor(Math.random() * 1000)}`
    })

    if (!error) {
      setTxStatus("✅ Espectáculo Creado")
      fetchEspectaculos()
      setShowModal(false)
      setNewShow({ nombre: '', provincia: 'Salta', anio: '2026', presupuesto: '', descripcion: '' })
    } else {
      setTxStatus("❌ Error: " + error.message)
    }
    setLoading(false)
    setTimeout(() => setTxStatus(null), 3000)
  }

  const filteredEspectaculos = espectaculos.filter(s => {
    // PRIVACY: Only show spectacles belonging to the connected account
    const isOwner = s.empresa_wallet?.toLowerCase() === account?.toLowerCase();
    
    return isOwner &&
           (filters.anio === '' || s.anio.toString() === filters.anio) &&
           (filters.provincia === '' || s.provincia === filters.provincia) &&
           (filters.presupuesto === '' || (
             filters.presupuesto === 'low' ? s.presupuesto < 1 :
             filters.presupuesto === 'mid' ? s.presupuesto >= 1 && s.presupuesto < 5 :
             s.presupuesto >= 5
           ))
  })

  const handleRegisterArtist = async () => {
    if (!account) return
    setLoading(true)
    setTxStatus("⏳ Sincronizando Perfil Legal...")
    try {
      const { error } = await supabase.from('artistas').upsert({ 
        ...regForm, 
        wallet: account.toLowerCase(), 
        genre: "Folklore" 
      }, { onConflict: 'wallet' })
      
      if (!error) {
        await checkUserRegistration(account)
        await fetchArtists()
        setTxStatus("✅ Perfil Actualizado Exitosamente.")
        setIsEditing(false)
      } else {
        setTxStatus("❌ Error: " + error.message)
      }
    } catch (e) { setTxStatus("❌ Error de red") }
    setLoading(false)
    setTimeout(() => setTxStatus(null), 4000)
  }

  const handleCreateContract = async () => {
    if (!selectedArtist) return
    setLoading(true)
    setTxStatus("⏳ Generando Contrato e Impuestos...")
    const { error } = await supabase.from('contratos').insert({
      show_name: activeShow?.nombre || selectedTemplate.name,
      artist_wallet: selectedArtist.wallet.toLowerCase(),
      amount: parseFloat(amount),
      ipfs_hash: generatedText.slice(0, 50),
      status: 'Funded',
      municipality_wallet: account?.toLowerCase()
    })
    if (!error) {
      setTxStatus("✅ ÉXITO: Liquidación Generada.")
      fetchAllContracts()
      setShowContractModal(false)
    }
    setLoading(false)
  }

  const handleRejectContract = async () => {
    if (!rejectingContractId) return
    setLoading(true)
    setTxStatus("⏳ Registrando Rechazo...")
    const { error } = await supabase
      .from('contratos')
      .update({ 
        status: 'Rejected', 
        rejection_reason: rejectionReason 
      })
      .eq('id', rejectingContractId)
    
    if (!error) {
      setTxStatus("✅ Propuesta Rechazada.")
      if (account) fetchUserContracts(account)
      fetchAllContracts()
      setRejectingContractId(null)
      setRejectionReason('')
    }
    setLoading(false)
  }

  const [productoraSubView, setProductoraSubView] = useState<'espectaculos' | 'artistas'>('espectaculos')

  const shortAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">🏛️</div>
          <div><div className="logo-text">Salta Fiscal</div><div className="logo-sub">Gestión & Sellos</div></div>
        </div>
        <nav className="nav">
          <button className={`nav-item ${activeTab === 'productora' ? 'active' : ''}`} onClick={() => { setActiveTab('productora'); setProductoraSubView('espectaculos'); }}>🏢 Soy Productora</button>
          <button className={`nav-item ${activeTab === 'artista' ? 'active' : ''}`} onClick={() => setActiveTab('artista')}>🎸 Soy Artista</button>
          <button className={`nav-item ${activeTab === 'control' ? 'active' : ''}`} onClick={() => setActiveTab('control')}>🔍 Soy Órgano de Control</button>
        </nav>

        {account && (
          <div className="network-badge" style={{ marginTop: 'auto' }}>
            <div className="network-dot"></div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text)' }}>AVALANCHE FUJI</div>
              <a 
                href={`${SNOWTRACE_BASE}${CONTRACT_ADDRESS}`} 
                target="_blank" 
                rel="noreferrer"
                style={{ fontSize: '0.6rem', color: 'var(--accent)', textDecoration: 'none' }}
              >
                Explorar Contrato ↗
              </a>
            </div>
          </div>
        )}
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="page-title">
            {activeTab === 'productora' && 'Panel de Productora'}
            {activeTab === 'artista' && 'Panel de Artista'}
            {activeTab === 'control' && 'Control de Liquidaciones'}
          </div>
          <button className="btn btn-primary" onClick={connectWallet}>{account ? shortAddr(account) : 'Identidad Digital'}</button>
        </header>

        {txStatus && <div className="connect-banner animate-in"><strong style={{ color: 'var(--accent)' }}>{txStatus}</strong></div>}

        {/* ── PRODUCTORA ── */}
        {activeTab === 'productora' && (
          <div className="animate-in">
            {!account ? (
              <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔐</div>
                <div className="card-title" style={{ fontSize: '1.5rem' }}>Identidad Digital Requerida</div>
                <div className="card-subtitle">Para gestionar tus espectáculos y artistas, debes conectar tu firma digital.</div>
                <button className="btn btn-primary btn-lg" style={{ maxWidth: '300px', margin: '0 auto' }} onClick={connectWallet}>Conectar Wallet</button>
              </div>
            ) : (
              <>
                <div className="tabs-sub" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                  <button className={`btn ${productoraSubView === 'espectaculos' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setProductoraSubView('espectaculos')}>🎭 Mis Espectáculos</button>
                  <button className={`btn ${productoraSubView === 'artistas' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setProductoraSubView('artistas')}>📇 Directorio de Artistas</button>
                </div>

                {productoraSubView === 'espectaculos' ? (
                  <>
                    <div className="filters-bar">
                      <div style={{ flex: 1, display: 'flex', gap: '1rem' }}>
                        <select className="input" style={{ width: '150px' }} value={filters.anio} onChange={e => setFilters({...filters, anio: e.target.value})}>
                          <option value="">Todos los Años</option>
                          <option value="2024">2024</option>
                          <option value="2025">2025</option>
                          <option value="2026">2026</option>
                        </select>
                        <select className="input" style={{ width: '150px' }} value={filters.provincia} onChange={e => setFilters({...filters, provincia: e.target.value})}>
                          <option value="">Todas las Provincias</option>
                          <option value="Salta">Salta</option>
                          <option value="Jujuy">Jujuy</option>
                          <option value="Tucumán">Tucumán</option>
                          <option value="Buenos Aires">Buenos Aires</option>
                        </select>
                        <select className="input" style={{ width: '180px' }} value={filters.presupuesto} onChange={e => setFilters({...filters, presupuesto: e.target.value})}>
                          <option value="">Cualquier Presupuesto</option>
                          <option value="low">Bajo (&lt; 1 AVAX)</option>
                          <option value="mid">Medio (1 - 5 AVAX)</option>
                          <option value="high">Alto (&gt; 5 AVAX)</option>
                        </select>
                      </div>
                      <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nuevo Espectáculo</button>
                    </div>

                    <div className="show-grid">
                      {filteredEspectaculos.map((show, i) => (
                        <div key={i} className="show-card animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
                          <div className="show-card-image">
                            {show.nombre.includes('Festival') ? '🎉' : show.nombre.includes('Peña') ? '🎸' : '🎭'}
                          </div>
                          <div className="show-card-content">
                            <div className="show-card-title">{show.nombre}</div>
                            <div className="show-card-info">
                              <span className="show-card-badge">{show.anio}</span>
                              <span className="show-card-badge">{show.provincia}</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1rem', minHeight: '3em' }}>
                              {show.descripcion || 'Sin descripción disponible.'}
                            </p>
                            <div className="show-card-budget">
                              {show.presupuesto} <span style={{ fontSize: '0.8rem', color: 'var(--text-mid)' }}>AVAX</span>
                            </div>
                            <button className="btn btn-ghost btn-sm" style={{ marginTop: '1rem', width: '100%' }} onClick={() => { setActiveShow(show); setAmount(show.presupuesto.toString()); setProductoraSubView('artistas'); }}>
                              Contratar Artistas
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {filteredEspectaculos.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                        <h3>No se encontraron espectáculos</h3>
                        <p>Prueba ajustando los filtros o crea uno nuevo.</p>
                      </div>
                    )}

                    <div className="card" style={{ marginTop: '2rem' }}>
                      <div className="card-title">📊 Seguimiento de Propuestas y Liquidaciones</div>
                      <div className="card-subtitle">Control de contratos y feedback de artistas.</div>
                      <table className="deal-table">
                        <thead>
                          <tr>
                            <th>Evento / Show</th>
                            <th>Artista</th>
                            <th>Monto</th>
                            <th>Estado</th>
                            <th>Feedback Artista</th>
                            <th>Auditoría</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allContracts
                            .filter(c => c.municipality_wallet?.toLowerCase() === account?.toLowerCase())
                            .map((c, i) => (
                              <tr key={i}>
                                <td><strong>{c.show_name}</strong></td>
                                <td>{shortAddr(c.artist_wallet)}</td>
                                <td>{c.amount} AVAX</td>
                                <td>
                                  <span className={`badge ${c.status === 'Rejected' ? 'badge-cancelled' : 'badge-released'}`}>
                                    {c.status === 'Funded' ? 'Pendiente' : 
                                     c.status === 'Rejected' ? 'Rechazado' : 
                                     c.status === 'Released' ? 'Liquidado' : c.status}
                                  </span>
                                </td>
                                <td style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-mid)' }}>
                                  {c.status === 'Rejected' ? c.rejection_reason : '-'}
                                </td>
                                <td>
                                  <a 
                                    href={`${SNOWTRACE_BASE}${CONTRACT_ADDRESS}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="btn btn-sm btn-ghost"
                                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                                  >
                                    🔗 Explorer
                                  </a>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="card animate-in">
                    <div className="card-title">📇 Directorio de Artistas Disponibles</div>
                    <div className="card-subtitle" style={{ marginBottom: '1.5rem' }}>Ecosistema unificado de artistas y prestadores de Salta.</div>
                    <table className="deal-table">
                      <thead><tr><th>Nombre</th><th>DNI</th><th>Wallet</th><th>Acción</th></tr></thead>
                      <tbody>
                        {artists.map((art, i) => (
                          <tr key={i}>
                            <td><strong>{art.name}</strong></td>
                            <td>{art.dni}</td>
                            <td style={{ fontFamily: 'monospace' }}>{shortAddr(art.wallet)}</td>
                            <td><button className="btn btn-sm btn-ghost" onClick={() => { setSelectedArtist(art); setShowContractModal(true); }}>Contratar</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', backdropFilter: 'blur(4px)' }}>
            <div className="card animate-in" style={{ maxWidth: '500px', width: '100%', border: '1px solid var(--primary)' }}>
              <div className="card-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>✨ Cargar Nuevo Espectáculo</div>
              <div className="form-group">
                <label>Nombre del Evento</label>
                <input placeholder="Ej: Festival del Poncho" value={newShow.nombre} onChange={e => setNewShow({...newShow, nombre: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Provincia</label>
                  <select className="input" value={newShow.provincia} onChange={e => setNewShow({...newShow, provincia: e.target.value})} style={{ background: 'var(--surface-2)', color: 'white' }}>
                    <option>Salta</option><option>Jujuy</option><option>Tucumán</option><option>Buenos Aires</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Año</label>
                  <input type="number" value={newShow.anio} onChange={e => setNewShow({...newShow, anio: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Presupuesto Total (AVAX)</label>
                <input type="number" step="0.01" placeholder="0.00" value={newShow.presupuesto} onChange={e => setNewShow({...newShow, presupuesto: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea placeholder="Detalles del espectáculo..." style={{ minHeight: '100px' }} value={newShow.descripcion} onChange={e => setNewShow({...newShow, descripcion: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn btn-primary btn-lg" onClick={handleCreateShow} disabled={loading}>{loading ? 'Cargando...' : 'Guardar Espectáculo'}</button>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {showContractModal && selectedArtist && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', backdropFilter: 'blur(4px)' }}>
            <div className="panel-grid animate-in" style={{ maxWidth: '1000px', width: '100%' }}>
              <div className="card">
                <div className="card-title">📜 Liquidación y Sellos</div>
                <div className="card-subtitle">Contratando a <strong>{selectedArtist.name}</strong> para <strong>{activeShow?.nombre || 'Evento'}</strong></div>
                
                <div className="form-group">
                  <label>Plantilla Legal</label>
                  <select className="input" style={{ width: '100%', background: 'var(--surface-2)', color: 'white' }} onChange={(e) => setSelectedTemplate(CONTRACT_TEMPLATES.find(t => t.id === e.target.value)!)}>
                    {CONTRACT_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Monto Bruto (AVAX)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                
                <div className="split-preview">
                  <div className="split-row"><span>Bruto:</span> <strong>{split.total.toFixed(10)}</strong></div>
                  <div className="split-row"><span style={{ color: 'var(--warning)' }}>DGR AE (3.6%):</span> <strong>- {split.taxAE.toFixed(10)}</strong></div>
                  <div className="split-row"><span style={{ color: 'var(--accent)' }}>Imp. Sellos (1.2%):</span> <strong>- {split.taxSellos.toFixed(10)}</strong></div>
                  <div className="split-row"><span>Neto Artista:</span> <strong style={{ color: 'var(--success)', fontSize: '1.2rem' }}>{split.net.toFixed(10)}</strong></div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-primary btn-lg" onClick={handleCreateContract}>Generar y Liquidar</button>
                  <button className="btn btn-ghost" onClick={() => setShowContractModal(false)}>Cancelar</button>
                </div>
              </div>

              <div className="card">
                <div className="card-title">📄 Documento Generado</div>
                <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem', whiteSpace: 'pre-line', marginTop: '1rem', height: '350px', overflowY: 'auto', border: '1px solid var(--border)' }}>
                  {generatedText}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ARTISTA ── */}
        {activeTab === 'artista' && (
          <div className="animate-in">
            {!account ? (
              <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔐</div>
                <div className="card-title" style={{ fontSize: '1.5rem' }}>Identidad Digital Requerida</div>
                <div className="card-subtitle">Para ver tus propuestas y perfil, debes conectar tu firma digital.</div>
                <button className="btn btn-primary btn-lg" style={{ maxWidth: '300px', margin: '0 auto' }} onClick={connectWallet}>Conectar Wallet</button>
              </div>
            ) : !isRegistered || isEditing ? (
              <div className="card" style={{ maxWidth: '400px', margin: '0 auto' }}>
                <div className="card-title">{isEditing ? 'Editar Registro' : 'Registro de Proveedor'}</div>
                <div className="card-subtitle" style={{ marginBottom: '1.5rem' }}>Mantené tus datos actualizados para tus contratos.</div>
                
                <div className="form-group">
                  <label>Nombre / Razón Social</label>
                  <input value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>DNI</label>
                  <input value={regForm.dni} onChange={e => setRegForm({...regForm, dni: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>CUIT</label>
                  <input value={regForm.cuit} onChange={e => setRegForm({...regForm, cuit: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Dirección Legal</label>
                  <input value={regForm.direccion} onChange={e => setRegForm({...regForm, direccion: e.target.value})} />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button className="btn btn-primary btn-lg" disabled={loading} onClick={handleRegisterArtist}>
                    {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Finalizar Registro'}
                  </button>
                  {isEditing && <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancelar</button>}
                </div>
              </div>
            ) : (
              <div className="panel-grid">
                <div className="card">
                  <div className="card-title">👤 {artistProfile.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: '1.6' }}>
                    DNI: {artistProfile.dni}<br/>
                    CUIT: {artistProfile.cuit}<br/>
                    Dir: {artistProfile.direccion}
                  </div>
                  <button className="btn btn-sm btn-ghost" style={{ marginTop: '1rem' }} onClick={() => setIsEditing(true)}>📝 Editar Perfil</button>
                </div>
                <div className="card">
                  <div className="card-title">📩 Propuestas Pendientes</div>
                  {userContracts.map((c, i) => (
                    <div key={i} style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: c.status === 'Rejected' ? '1px solid var(--error)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{c.show_name}</strong>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <a 
                            href={`${SNOWTRACE_BASE}${CONTRACT_ADDRESS}`} 
                            target="_blank" 
                            rel="noreferrer"
                            title="Ver en Snowtrace"
                            style={{ textDecoration: 'none', fontSize: '1rem' }}
                          >
                            ❄️
                          </a>
                          <span className={`badge ${c.status === 'Rejected' ? 'badge-cancelled' : 'badge-funded'}`}>
                            {c.status === 'Funded' ? 'Pendiente de Firma' : 
                             c.status === 'Rejected' ? 'Rechazado' : 
                             c.status === 'Released' ? 'Liquidado' : c.status}
                          </span>
                        </div>
                      </div>
                      <div style={{ color: 'var(--success)' }}>{(c.amount * 0.952).toFixed(10)} AVAX</div>
                      
                      {c.status === 'Funded' && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button className="btn btn-sm btn-primary" onClick={() => setShowFullContract(true)}>Leer y Firmar</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => setRejectingContractId(c.id)}>Rechazar</button>
                        </div>
                      )}

                      {c.status === 'Rejected' && (
                        <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--text-dim)' }}>
                          <strong>Tu motivo:</strong> {c.rejection_reason}
                        </div>
                      )}

                      {rejectingContractId === c.id && (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Motivo del rechazo:</label>
                          <textarea 
                            className="input" 
                            style={{ width: '100%', minHeight: '80px', marginBottom: '1rem', background: 'var(--surface-2)', color: 'white' }}
                            value={rejectionReason}
                            onChange={e => setRejectionReason(e.target.value)}
                            placeholder="Ej: El monto es incorrecto o la fecha no está disponible..."
                          />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-sm btn-primary" style={{ background: 'var(--error)' }} onClick={handleRejectContract}>Confirmar Rechazo</button>
                            <button className="btn btn-sm btn-ghost" onClick={() => setRejectingContractId(null)}>Cancelar</button>
                          </div>
                        </div>
                      )}

                      {showFullContract && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                          <div className="card" style={{ maxWidth: '600px', width: '100%', background: 'var(--surface)' }}>
                            <div className="card-title">Documento Legal</div>
                            <div style={{ whiteSpace: 'pre-line', fontSize: '0.85rem', margin: '1.5rem 0', maxHeight: '50vh', overflowY: 'auto' }}>{generatedText}</div>
                            <button className="btn btn-primary btn-lg" onClick={() => { setShowFullContract(false); setTxStatus("✅ Firmado."); }}>ACEPTO Y FIRMO</button>
                            <button className="btn btn-sm btn-ghost" style={{ marginTop: '0.5rem', width: '100%' }} onClick={() => setShowFullContract(false)}>Cerrar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {userContracts.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>No tenés propuestas pendientes.</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CONTROL ── */}
        {activeTab === 'control' && (
          <div className="animate-in">
            {!account ? (
              <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔐</div>
                <div className="card-title" style={{ fontSize: '1.5rem' }}>Identidad Digital Requerida</div>
                <div className="card-subtitle">Para acceder al panel de control, debes conectar tu firma digital.</div>
                <button className="btn btn-primary btn-lg" style={{ maxWidth: '300px', margin: '0 auto' }} onClick={connectWallet}>Conectar Wallet</button>
              </div>
            ) : (
              <>
                <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                  <div className="card stat-card">
                    <div className="stat-label">Contratos Fiscalizados</div>
                    <div className="stat-value">{allContracts.length}</div>
                    <div className="stat-change">100% Cobertura</div>
                  </div>
                  <div className="card stat-card">
                    <div className="stat-label">Recaudación AE (3.6%)</div>
                    <div className="stat-value" style={{ color: 'var(--warning)' }}>
                      {(allContracts.reduce((acc, c) => acc + (c.amount * 0.036), 0)).toFixed(4)}
                    </div>
                    <div className="stat-label" style={{ marginTop: '0.5rem' }}>AVAX</div>
                  </div>
                  <div className="card stat-card">
                    <div className="stat-label">Recaudación Sellos (1.2%)</div>
                    <div className="stat-value" style={{ color: 'var(--accent)' }}>
                      {(allContracts.reduce((acc, c) => acc + (c.amount * 0.012), 0)).toFixed(4)}
                    </div>
                    <div className="stat-label" style={{ marginTop: '0.5rem' }}>AVAX</div>
                  </div>
                  <div className="card stat-card">
                    <div className="stat-label">Estado del Tesoro</div>
                    <div className="stat-value" style={{ color: 'var(--success)' }}>Operativo</div>
                    <div className="stat-change">Verificado</div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">🔍 Panel de Control de Liquidaciones</div>
                  <div className="card-subtitle">Vista unificada para Seguimiento de Operaciones y Control Fiscal.</div>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table className="deal-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Evento / Jurisdicción</th>
                          <th>Artista / CUIT</th>
                          <th>Bruto (AVAX)</th>
                          <th>Act. Econ. (3.6%)</th>
                          <th>Sellos (1.2%)</th>
                          <th>Neto</th>
                          <th>Estado</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allContracts.map((c, i) => (
                          <tr key={i}>
                            <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                            <td>
                              <strong>{c.show_name}</strong>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Salta, Capital</div>
                            </td>
                            <td>
                              {shortAddr(c.artist_wallet)}
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Auditado ✅</div>
                            </td>
                            <td style={{ fontWeight: 600 }}>{c.amount}</td>
                            <td style={{ color: 'var(--warning)' }}>{(c.amount * 0.036).toFixed(6)}</td>
                            <td style={{ color: 'var(--accent)' }}>{(c.amount * 0.012).toFixed(6)}</td>
                            <td style={{ color: 'var(--success)', fontWeight: 600 }}>{(c.amount * 0.952).toFixed(6)}</td>
                            <td>
                              <span className={`badge ${c.status === 'Rejected' ? 'badge-cancelled' : 'badge-released'}`}>
                                {c.status === 'Funded' ? 'Pendiente de Firma' : 
                                 c.status === 'Rejected' ? 'Rechazado' : 
                                 c.status === 'Released' ? 'Liquidado' : c.status}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-sm btn-ghost" onClick={() => setTxStatus(`🔍 Auditando contrato ${c.id}...`)}>Fiscalizar</button>
                                <a 
                                  href={`${SNOWTRACE_BASE}${CONTRACT_ADDRESS}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="btn btn-sm btn-ghost"
                                  style={{ padding: '0.4rem' }}
                                  title="Ver en Avalanche"
                                >
                                  🔗
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {allContracts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                      <h3>Sin registros para auditar</h3>
                      <p>Los contratos aparecerán aquí una vez que sean emitidos por las productoras.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>

    </div>
  )
}
