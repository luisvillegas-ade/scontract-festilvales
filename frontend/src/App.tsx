import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { ethers } from 'ethers'
import { ESCROW_ABI } from './lib/abi'

const CONTRACT_ADDRESS = "0x7BAbe0be4Db28d3a862BA3E3e57Ba01E311a2C42"
const SNOWTRACE_BASE = "https://testnet.snowtrace.io/address/"

const CONTRACT_TEMPLATES = [
  { 
    id: 'standard', 
    name: 'Show Festivalero Estándar (Salta)', 
    text: `CONTRATO DE LOCACIÓN DE SERVICIOS ARTÍSTICOS

En la Ciudad de Salta, entre la Empresa Productora responsable del evento "{{show_name}}", en adelante "LA PRODUCTORA", y el Artista {{name}}, DNI {{dni}}, CUIT {{cuit}}, con domicilio en {{direccion}}, en adelante "EL ARTISTA", se conviene lo siguiente:

CLÁUSULA PRIMERA: OBJETO
EL ARTISTA se obliga a prestar servicios artísticos consistentes en una presentación en vivo en el evento denominado "{{show_name}}", a realizarse en {{location}} el día {{show_date}}.

CLÁUSULA SEGUNDA: CONTRA PRESTACIÓN
LA PRODUCTORA abonará a EL ARTISTA la suma bruta de {{amount}} AVAX. 

CLÁUSULA TERCERA: RETENCIONES FISCALES Y SELLADO
De la suma mencionada se aplicarán las siguientes retenciones obligatorias según normativa provincial de Salta:
1. Impuesto a las Actividades Económicas (AE): 3.6%.
2. Impuesto de Sellos: 1.2%.
Total de retenciones: 4.8%. El monto neto resultante será liquidado a favor de EL ARTISTA.

CLÁUSULA CUARTA: MODALIDAD DE PAGO
El pago se gestionará mediante un Contrato Inteligente (Smart Contract) en la red Avalanche Fuji (Protocolo Salta Fiscal). Los fondos quedarán en custodia (escrow) y serán liberados una vez confirmada la efectiva prestación del servicio.

CLÁUSULA QUINTA: OBLIGACIONES
EL ARTISTA se compromete a cumplir con el rider técnico acordado y presentarse con la debida antelación.

CLÁUSULA SEXTA: JURISDICCIÓN
Para cualquier controversia, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Ciudad de Salta.`
  },
  { 
    id: 'private', 
    name: 'Evento Privado / Corporativo', 
    text: `CONTRATO PRIVADO DE PRESTACIÓN ARTÍSTICA

Entre la Productora Responsable del evento "{{show_name}}" y el Artista {{name}}, DNI {{dni}}, se acuerda la contratación para la fecha {{show_date}} en {{location}}.

Monto acordado: {{amount}} AVAX.
Se aplicarán las retenciones fiscales de ley vigentes en la Provincia de Salta (4.8% total).

El pago se realiza mediante tecnología blockchain Avalanche para garantizar transparencia y seguridad en la liquidación de haberes.`
  }
]

export default function App() {
  const [account, setAccount] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'productora' | 'artista' | 'control' | 'banco' | null>(null)
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
  const [editingShowId, setEditingShowId] = useState<number | null>(null)
  const [activeShow, setActiveShow] = useState<any>(null)
  const [showContractModal, setShowContractModal] = useState(false)
  const [selectedContractForSign, setSelectedContractForSign] = useState<any>(null)
  
  const [newShow, setNewShow] = useState({
    nombre: '',
    provincia: 'Salta',
    anio: new Date().getFullYear().toString(),
    fecha_ejecucion: '',
    presupuesto: '',
    descripcion: ''
  })
  const [filters, setFilters] = useState({
    anio: '',
    provincia: '',
    presupuesto: ''
  })

  // Audit state (Solo para UI de feedback)
  const [isConfirmingPerformance, setIsConfirmingPerformance] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState<any>(null)

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
    .replace(/{{name}}/g, selectedArtist?.name || '...')
    .replace(/{{dni}}/g, selectedArtist?.dni || '...')
    .replace(/{{cuit}}/g, selectedArtist?.cuit || '...')
    .replace(/{{direccion}}/g, selectedArtist?.direccion || '...')
    .replace(/{{amount}}/g, amount)
    .replace(/{{show_name}}/g, activeShow?.nombre || 'Evento General')
    .replace(/{{show_date}}/g, activeShow?.fecha_ejecucion ? new Date(activeShow.fecha_ejecucion).toLocaleDateString() : 'Fecha a confirmar')
    .replace(/{{location}}/g, activeShow?.provincia || 'Salta, Argentina')

  // ─── EFFECTS ───
  useEffect(() => { 
    if (showContractModal || showFullContract || showSuccessModal || showModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [showContractModal, showFullContract, showSuccessModal, showModal])

  useEffect(() => { 
    fetchArtists() 
    fetchEspectaculos()
  }, [])
  useEffect(() => { 
    if (account) {
      checkUserRegistration(account)
      fetchAllContracts()
    } else {
      setIsRegistered(false)
      setArtistProfile(null)
      setUserContracts([])
    }
  }, [account])

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        setAccount(accounts[0] || null)
      })
    }
  }, [])

  // ─── ACTIONS ───
  const connectWallet = async () => {
    console.log("Intentando conectar wallet...");
    if (!window.ethereum) {
      alert("No se detectó MetaMask. Por favor, instalá la extensión para continuar.");
      return;
    }
    try {
      setTxStatus("⏳ Conectando con MetaMask...");
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setTxStatus(null);
      } else {
        setTxStatus("❌ No se seleccionó ninguna cuenta.");
      }
    } catch (err: any) {
      console.error("Error al conectar wallet:", err);
      setTxStatus("❌ Error de conexión: " + err.message);
      setTimeout(() => setTxStatus(null), 4000);
    }
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
      setArtistProfile(null)
      setUserContracts([])
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
    const showData = {
      nombre: newShow.nombre,
      provincia: newShow.provincia,
      anio: parseInt(newShow.anio),
      fecha_ejecucion: newShow.fecha_ejecucion,
      presupuesto: parseFloat(newShow.presupuesto),
      descripcion: newShow.descripcion,
      empresa_wallet: account.toLowerCase(),
      imagen_url: `https://loremflickr.com/400/300/concert?lock=${Math.floor(Math.random() * 1000)}`
    }

    let error;
    if (editingShowId) {
      const { error: err } = await supabase
        .from('espectaculos')
        .update(showData)
        .eq('id', editingShowId)
      error = err
    } else {
      const { error: err } = await supabase.from('espectaculos').insert(showData)
      error = err
    }

    if (!error) {
      setTxStatus(editingShowId ? "✅ Espectáculo Actualizado" : "✅ Espectáculo Creado")
      fetchEspectaculos()
      setShowModal(false)
      setEditingShowId(null)
      setNewShow({ nombre: '', provincia: 'Salta', anio: '2026', presupuesto: '', descripcion: '' })
    } else {
      setTxStatus("❌ Error: " + error.message)
    }
    setLoading(false)
    setTimeout(() => setTxStatus(null), 3000)
  }

  const handleDeleteShow = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este espectáculo? Se perderán todos los datos asociados.")) return
    setLoading(true)
    const { error } = await supabase.from('espectaculos').delete().eq('id', id)
    if (!error) {
      setTxStatus("✅ Espectáculo Eliminado")
      fetchEspectaculos()
    } else {
      setTxStatus("❌ Error al eliminar: " + error.message)
    }
    setLoading(false)
    setTimeout(() => setTxStatus(null), 3000)
  }

  const startEditShow = (show: any) => {
    setEditingShowId(show.id)
    setNewShow({
      nombre: show.nombre,
      provincia: show.provincia,
      anio: show.anio.toString(),
      fecha_ejecucion: show.fecha_ejecucion,
      presupuesto: show.presupuesto.toString(),
      descripcion: show.descripcion
    })
    setShowModal(true)
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
    if (!selectedArtist || !window.ethereum || !account) return
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setTxStatus("⚠️ Por favor, ingresa un monto válido.")
      setLoading(false)
      return
    }

    try {
      console.log("🚀 Iniciando creación de contrato para:", selectedArtist.wallet)
      const provider = new ethers.BrowserProvider(window.ethereum as any)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ESCROW_ABI, signer)
      
      const val = ethers.parseEther(amount)
      const ipfsHash = `scontract_${Date.now()}`
      
      setTxStatus("⏳ Revisa tu MetaMask para confirmar el depósito...")
      console.log("📡 Enviando transacción 'depositarEscrow'...")
      
      // Limpiamos el address por si acaso
      const artistAddr = selectedArtist.wallet.trim()
      
      // Comprobamos saldo antes de intentar
      const balance = await provider.getBalance(account)
      if (balance < val) {
        throw new Error("Saldo insuficiente en tu wallet para cubrir el depósito y el gas.")
      }

      // Forzamos un gasLimit para evitar fallos de estimación en Fuji
      const tx = await contract.depositarEscrow(artistAddr, ipfsHash, { 
        value: val,
        gasLimit: 500000 // Límite generoso para evitar 'missing revert data'
      })
      
      setTxStatus("⏳ Transacción enviada. Esperando confirmación en Fuji...")
      console.log("🔗 TX Hash:", tx.hash)
      await tx.wait()
      console.log("✅ Transacción confirmada!")
      
      const { error } = await supabase.from('contratos').insert({
        show_id: activeShow?.id,
        show_name: activeShow?.nombre || selectedTemplate.name,
        fecha_show: activeShow?.fecha_ejecucion,
        hora_show: "21:00",
        artist_wallet: selectedArtist.wallet.toLowerCase(),
        amount: parseFloat(amount),
        ipfs_hash: ipfsHash,
        status: 'Funded',
        template_id: selectedTemplate.id,
        municipality_wallet: account?.toLowerCase()
      })
      
      if (!error) {
        setTxStatus("✅ ÉXITO: Contrato en Blockchain y DB.")
        setShowSuccessModal({
          artist: selectedArtist.name,
          amount: amount,
          txHash: tx.hash,
          ipfsHash: ipfsHash
        })
        fetchAllContracts()
        setShowContractModal(false)
      } else {
        setTxStatus("⚠️ DB Error: " + error.message)
      }
    } catch (e: any) {
      console.error("❌ Error en la transacción:", e)
      setTxStatus("❌ Error Blockchain: " + (e.reason || e.message || "Fallo en la firma"))
    }
    setLoading(false)
  }

  const handleReleaseFunds = async (ipfsHash: string) => {
    if (!window.ethereum || !account) return
    setLoading(true)
    setTxStatus("⏳ Ejecutando Split Triple en Avalanche...")
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ESCROW_ABI, signer)
      
      const tx = await contract.liberarPagoEscrow(ipfsHash)
      setTxStatus("⏳ Confirmando Liquidación...")
      await tx.wait()
      
      const { error } = await supabase
        .from('contratos')
        .update({ status: 'Released' })
        .eq('ipfs_hash', ipfsHash)
      
      if (!error) {
        setTxStatus("✅ ÉXITO: Fondos Distribuidos (95.2% Artista, 4.8% Tax).")
        fetchAllContracts()
        if (account) fetchUserContracts(account)
      }
    } catch (e: any) {
      console.error(e)
      setTxStatus("❌ Error: " + (e.reason || e.message))
    }
    setLoading(false)
  }

  const handleConfirmPerformance = async (contractId: string) => {
    setLoading(true)
    setTxStatus("⏳ Registrando cumplimiento del artista...")
    const { error } = await supabase
      .from('contratos')
      .update({ status: 'Confirmed' })
      .eq('id', contractId)
    
    if (!error) {
      setTxStatus("✅ Actuación Confirmada. Esperando liberación de la Productora.")
      if (account) fetchUserContracts(account)
      fetchAllContracts()
    }
    setLoading(false)
    setTimeout(() => setTxStatus(null), 3000)
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
  const handleSignContract = async (contractId: string) => {
    setLoading(true)
    setTxStatus("⏳ Procesando Firma Digital y Liquidación...")
    const { error } = await supabase
      .from('contratos')
      .update({ status: 'Signed' }) // Cambiado de Released a Signed
      .eq('id', contractId)
    
    if (!error) {
      setTxStatus("✅ ÉXITO: Contrato Firmado y Liquidado.")
      if (account) fetchUserContracts(account)
      fetchAllContracts()
      setShowFullContract(false)
    } else {
      setTxStatus("❌ Error al firmar: " + error.message)
    }
    setLoading(false)
    setTimeout(() => setTxStatus(null), 4000)
  }

  const handleDownloadPDF = (contract: any) => {
    setTxStatus(`⏳ Generando PDF para: ${contract.show_name}...`)
    setTimeout(() => {
      window.print()
      setTxStatus(null)
    }, 1500)
  }

  const handleRequestFiat = async (contractId: string) => {
    setLoading(true)
    setTxStatus("⏳ Solicitando Liquidación a Cuenta Bancaria...")
    const { error } = await supabase
      .from('contratos')
      .update({ status: 'FiatPending' })
      .eq('id', contractId)
    
    if (!error) {
      setTxStatus("✅ Solicitud enviada al Banco.")
      if (account) fetchUserContracts(account)
      fetchAllContracts()
    } else {
      setTxStatus("❌ Error: " + error.message)
    }
    setLoading(false)
    setTimeout(() => setTxStatus(null), 3000)
  }

  const handleSettleFiat = async (contractId: string) => {
    setLoading(true)
    setTxStatus("⏳ Transfiriendo Pesos al Artista (Off-Ramp)...")
    // Simulamos delay del banco
    setTimeout(async () => {
      const { error } = await supabase
        .from('contratos')
        .update({ status: 'FiatSettled' })
        .eq('id', contractId)
      
      if (!error) {
        setTxStatus("✅ ÉXITO: Transferencia Bancaria Completada.")
        fetchAllContracts()
      } else {
        setTxStatus("❌ Error bancario: " + error.message)
      }
      setLoading(false)
      setTimeout(() => setTxStatus(null), 4000)
    }, 2000)
  }

  // --- SUB COMPONENTS ---
  const RoleSelector = () => (
    <div className="animate-in" style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
      gap: '1rem', 
      padding: '1rem',
      maxWidth: '900px',
      margin: '0 auto'
    }}>
      <div 
        className={`card role-card ${isRegistered ? 'disabled' : ''}`} 
        onClick={() => !isRegistered && setActiveTab('productora')} 
        style={{ cursor: isRegistered ? 'not-allowed' : 'pointer', textAlign: 'center', opacity: isRegistered ? 0.6 : 1, padding: '1.5rem' }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🏢</div>
        <div className="card-title" style={{ fontSize: '0.9rem' }}>Soy Productora</div>
        <div className="card-subtitle" style={{ fontSize: '0.7rem', marginBottom: '0' }}>
          Gestionar shows.
        </div>
      </div>
      
      <div className="card role-card" onClick={() => setActiveTab('artista')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.5rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🎸</div>
        <div className="card-title" style={{ fontSize: '0.9rem' }}>Soy Artista</div>
        <div className="card-subtitle" style={{ fontSize: '0.7rem', marginBottom: '0' }}>Firmar y cobrar.</div>
      </div>

      <div 
        className={`card role-card ${isRegistered ? 'disabled' : ''}`} 
        onClick={() => !isRegistered && setActiveTab('control')} 
        style={{ cursor: isRegistered ? 'not-allowed' : 'pointer', textAlign: 'center', opacity: isRegistered ? 0.6 : 1, padding: '1.5rem' }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔍</div>
        <div className="card-title" style={{ fontSize: '0.9rem' }}>Control</div>
        <div className="card-subtitle" style={{ fontSize: '0.7rem', marginBottom: '0' }}>
          Fiscalización.
        </div>
      </div>

      <div 
        className={`card role-card ${isRegistered ? 'disabled' : ''}`} 
        onClick={() => !isRegistered && setActiveTab('banco')} 
        style={{ cursor: isRegistered ? 'not-allowed' : 'pointer', textAlign: 'center', opacity: isRegistered ? 0.6 : 1, padding: '1.5rem' }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🏦</div>
        <div className="card-title" style={{ fontSize: '0.9rem' }}>Banco</div>
        <div className="card-subtitle" style={{ fontSize: '0.7rem', marginBottom: '0' }}>
          Liquidador Fiat.
        </div>
      </div>
    </div>
  )

  const [productoraSubView, setProductoraSubView] = useState<'espectaculos' | 'artistas'>('espectaculos')

  const shortAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`

  return (
    <div className={`app ${!activeTab ? 'app-no-sidebar' : ''}`}>
      {activeTab && (
        <aside className="sidebar">
          <div className="logo" onClick={() => setActiveTab(null)} style={{ cursor: 'pointer' }}>
            <div className="logo-icon">🏛️</div>
            <div><div className="logo-text">Salta Fiscal</div><div className="logo-sub">B2B Dashboard</div></div>
          </div>
          <nav className="nav">
            {activeTab === 'productora' && <button className="nav-item active">🏢 Gestión de Shows</button>}
            {activeTab === 'artista' && <button className="nav-item active">🎸 Mis Contratos</button>}
            {activeTab === 'control' && <button className="nav-item active">🔍 Auditoría Fiscal</button>}
            {activeTab === 'banco' && <button className="nav-item active">🏦 Liquidaciones Fiat</button>}
          </nav>
          
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 'auto', marginBottom: '1rem' }} onClick={() => setActiveTab(null)}>⇄ Cambiar Perfil</button>

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
      )}

      <main className="main">
        {account && (
          <header className="topbar">
            <div className="page-title">
              {!activeTab ? 'Selecciona tu Perfil' : 
                activeTab === 'productora' ? 'Panel de Productora' : 
                activeTab === 'artista' ? 'Panel de Artista' : 'Panel de Control'}
            </div>
            <button className="btn btn-primary" onClick={connectWallet}>{shortAddr(account)}</button>
          </header>
        )}

        {txStatus && <div className="connect-banner animate-in"><strong style={{ color: 'var(--accent)' }}>{txStatus}</strong></div>}

        {!account ? (
          <div className="hero-section animate-in" style={{ position: 'relative', zIndex: 100 }}>
            <div className="hero-graphic" style={{ backgroundImage: 'url(/hero.png)' }}></div>
            <h1 className="hero-title">SContract Artistas Salta</h1>
            <p className="hero-subtitle">
              Infraestructura digital para la gestión de espectáculos, contratos inteligentes y recaudación fiscal automatizada sobre la red Avalanche.
            </p>
            <button className="btn btn-primary btn-lg" onClick={connectWallet}>Comenzar con Identidad Digital</button>
          </div>
        ) : !activeTab ? (
          <RoleSelector />
        ) : (
          <>
            {/* ── PRODUCTORA ── */}
            {activeTab === 'productora' && (
              <div className="animate-in">
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div className="show-card-title">{show.nombre}</div>
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button className="btn btn-sm btn-ghost" style={{ padding: '0.2rem' }} onClick={() => startEditShow(show)} title="Editar">✏️</button>
                                <button className="btn btn-sm btn-ghost" style={{ padding: '0.2rem', color: 'var(--error)' }} onClick={() => handleDeleteShow(show.id)} title="Eliminar">🗑️</button>
                              </div>
                            </div>
                            <div className="show-card-info">
                              <span className="show-card-badge">{show.anio}</span>
                              <span className="show-card-badge">{show.provincia}</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1rem', minHeight: '3em' }}>
                              {show.descripcion || 'Sin descripción disponible.'}
                            </p>
                            <div className="show-card-info" style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--primary)' }}>
                              📅 {show.fecha_ejecucion ? new Date(show.fecha_ejecucion).toLocaleDateString() : 'Sin fecha'}
                            </div>
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
                            <th>Acción / Liquidación</th>
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
                                  <span className={`badge ${
                                     c.status === 'Rejected' ? 'badge-cancelled' : 
                                     c.status === 'Funded' ? 'badge-funded' :
                                     c.status === 'Signed' ? 'badge-released' :
                                     c.status === 'Confirmed' ? 'badge-confirmed' : 'badge-released'
                                   }`}>
                                     {c.status === 'Funded' ? 'Pendiente Firma' : 
                                      c.status === 'Signed' ? 'Contrato Firmado' :
                                      c.status === 'Confirmed' ? 'Show Realizado' :
                                      c.status === 'Rejected' ? 'Rechazado' : 'Liquidado'}
                                   </span>
                                </td>
                                <td style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-mid)' }}>
                                  {c.status === 'Rejected' ? c.rejection_reason : '-'}
                                </td>
                                 <td>
                                   <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                     {c.status === 'Confirmed' ? (
                                       <button 
                                         className="btn btn-sm btn-primary" 
                                         style={{ background: 'var(--success)' }}
                                         onClick={() => handleReleaseFunds(c.ipfs_hash)}
                                       >
                                         💰 Finalizar y Pagar
                                       </button>
                                     ) : c.status === 'Funded' ? (
                                       <span style={{ fontSize: '0.7rem', color: 'var(--warning)' }}>⏳ Esperando Firma</span>
                                     ) : c.status === 'Signed' ? (
                                       <span style={{ fontSize: '0.7rem', color: 'var(--text-mid)' }}>📅 Esperando Show</span>
                                     ) : (
                                       <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>-</span>
                                     )}
                                     {c.status !== 'Rejected' && (
                                       <div style={{ display: 'flex', gap: '0.25rem' }}>
                                         <a 
                                           href={`${SNOWTRACE_BASE}${CONTRACT_ADDRESS}`} 
                                           target="_blank" 
                                           rel="noreferrer"
                                           className="btn btn-sm btn-ghost"
                                           style={{ padding: '0.4rem' }}
                                           title="Ver en Avalanche Explorer"
                                         >
                                           🔗
                                         </a>
                                         <button 
                                           className="btn btn-sm btn-ghost" 
                                           style={{ padding: '0.4rem' }} 
                                           onClick={() => handleDownloadPDF(c)}
                                           title="Descargar Contrato PDF"
                                         >
                                           📥
                                         </button>
                                       </div>
                                     )}
                                   </div>
                                 </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="animate-in">
                    {activeShow && (
                      <div className="card" style={{ background: 'var(--surface-2)', border: '1px solid var(--primary)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700 }}>Contratando para</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{activeShow.nombre}</div>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => setProductoraSubView('espectaculos')}>← Volver a Mis Espectáculos</button>
                      </div>
                    )}
                    <div className="card">
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
                  </div>
                )}
              </div>
            )}

        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', backdropFilter: 'blur(4px)' }}>
            <div className="card animate-in" style={{ maxWidth: '500px', width: '100%', border: '1px solid var(--primary)' }}>
              <div className="card-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>
                {editingShowId ? '✏️ Editar Espectáculo' : '✨ Cargar Nuevo Espectáculo'}
              </div>
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
                  <label>Fecha de Ejecución</label>
                  <input type="date" value={newShow.fecha_ejecucion} onChange={e => setNewShow({...newShow, fecha_ejecucion: e.target.value})} />
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
                <button className="btn btn-primary btn-block" onClick={handleCreateShow} disabled={loading}>
                  {loading ? 'Guardando...' : editingShowId ? 'Actualizar' : 'Guardar'}
                </button>
                <button className="btn btn-ghost" onClick={() => { setShowModal(false); setEditingShowId(null); setNewShow({ nombre: '', provincia: 'Salta', anio: '2026', presupuesto: '', descripcion: '', fecha_ejecucion: '' }); }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {showContractModal && selectedArtist && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)', overflowY: 'auto' }}>
            <div className="panel-grid animate-in" style={{ maxWidth: '1100px', width: '100%', maxHeight: '95vh', margin: 'auto' }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                <div className="card-title">📜 Liquidación y Sellos</div>
                <div className="card-subtitle" style={{ marginBottom: '1rem' }}>Finalizando detalles de contratación y fiscalización.</div>
                
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ marginBottom: '0.25rem' }}>Evento / Espectáculo</label>
                    <div style={{ background: 'var(--surface-2)', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--primary)', fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>
                      🏟️ {activeShow?.nombre || 'Evento General'}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ marginBottom: '0.25rem' }}>Artista / Proveedor</label>
                    <div style={{ background: 'var(--surface-2)', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)', fontWeight: 600, fontSize: '0.85rem' }}>
                      🎸 {selectedArtist.name} ({selectedArtist.dni})
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ marginBottom: '0.25rem' }}>Plantilla Legal</label>
                    <select className="input" style={{ width: '100%', background: 'var(--surface-2)', color: 'white', padding: '0.6rem' }} onChange={(e) => setSelectedTemplate(CONTRACT_TEMPLATES.find(t => t.id === e.target.value)!)}>
                      {CONTRACT_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ marginBottom: '0.25rem' }}>Monto Bruto (AVAX)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} disabled={loading} style={{ padding: '0.6rem' }} />
                  </div>
                  
                  <div className="split-preview" style={{ padding: '0.75rem', marginBottom: '0' }}>
                    <div className="split-row" style={{ fontSize: '0.8rem' }}><span>Bruto:</span> <strong>{split.total.toFixed(10)}</strong></div>
                    <div className="split-row" style={{ fontSize: '0.8rem' }}><span style={{ color: 'var(--warning)' }}>DGR AE (3.6%):</span> <strong>- {split.taxAE.toFixed(10)}</strong></div>
                    <div className="split-row" style={{ fontSize: '0.8rem' }}><span style={{ color: 'var(--accent)' }}>Imp. Sellos (1.2%):</span> <strong>- {split.taxSellos.toFixed(10)}</strong></div>
                    <div className="split-row" style={{ fontSize: '0.8rem' }}><span>Neto Artista:</span> <strong style={{ color: 'var(--success)', fontSize: '1rem' }}>{split.net.toFixed(10)}</strong></div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <button className="btn btn-primary btn-block" style={{ flex: 2 }} onClick={handleCreateContract} disabled={loading}>
                    {loading ? 'Procesando...' : 'Generar y Liquidar'}
                  </button>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowContractModal(false)} disabled={loading}>Cancelar</button>
                </div>
              </div>

              <div className="card" style={{ padding: '0', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Vista Previa</span>
                  <span className="badge badge-funded" style={{ fontSize: '0.55rem' }}>Borrador Digital</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', background: '#222' }}>
                  <div className="contract-paper" style={{ transform: 'scale(0.85)', transformOrigin: 'top center', margin: '0 auto' }}>
                    <div className="contract-watermark" style={{ fontSize: '3rem' }}>
                      {txStatus?.includes('✅') ? 'FIRMADO' : 'BORRADOR'}
                    </div>
                    
                    <div className="contract-header" style={{ marginBottom: '1rem' }}>
                      <div className="contract-title" style={{ fontSize: '1rem' }}>Instrumento Legal</div>
                      <div style={{ fontSize: '0.6rem', marginTop: '0.2rem', color: '#666' }}>Digital ID: {selectedArtist?.wallet?.slice(0, 10).toUpperCase()}</div>
                    </div>

                    <div className="contract-body" style={{ fontSize: '0.85rem' }}>
                      {generatedText}
                    </div>

                    <div className="signature-section" style={{ marginTop: '2rem', gap: '1rem' }}>
                      <div className="signature-box" style={{ paddingTop: '0.5rem', fontSize: '0.65rem' }}>
                        Por LA PRODUCTORA
                      </div>
                      <div className="signature-box" style={{ paddingTop: '0.5rem', fontSize: '0.65rem' }}>
                        Por EL ARTISTA
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE ÉXITO */}
        {showSuccessModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', backdropFilter: 'blur(10px)' }}>
            <div className="card animate-in" style={{ maxWidth: '450px', width: '100%', textAlign: 'center', padding: '3rem', border: '1px solid var(--success)' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>✅</div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>¡Contrato en Blockchain!</h2>
              <p style={{ color: 'var(--text-dim)', marginBottom: '2rem' }}>
                Se ha generado el contrato para <strong>{showSuccessModal.artist}</strong> por <strong>{showSuccessModal.amount} AVAX</strong>.
              </p>
              
              <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '8px', textAlign: 'left', marginBottom: '2rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Transaction Hash (Fuji)</div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', color: 'var(--accent)' }}>{showSuccessModal.txHash}</div>
              </div>

              <button className="btn btn-primary btn-lg" onClick={() => setShowSuccessModal(null)}>Entendido</button>
            </div>
          </div>
        )}

        {/* ── ARTISTA ── */}
        {activeTab === 'artista' && (
          <div className="animate-in">
            {!isRegistered || isEditing ? (
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="stats-grid">
                  <div className="card stat-card">
                    <div className="stat-label">Proveedor / Artista</div>
                    <div className="stat-value" style={{ fontSize: '1.3rem' }}>{artistProfile.name}</div>
                    <div className="stat-change" style={{ color: 'var(--text-dim)' }}>DNI: {artistProfile.dni}</div>
                  </div>
                  <div className="card stat-card">
                    <div className="stat-label">CUIT Registro</div>
                    <div className="stat-value" style={{ fontSize: '1.1rem' }}>{artistProfile.cuit}</div>
                    <div className="stat-change" style={{ color: 'var(--text-dim)' }}>Válido en Salta</div>
                  </div>
                  <div className="card stat-card">
                    <div className="stat-label">Contratos Totales</div>
                    <div className="stat-value">{userContracts.length}</div>
                    <div className="stat-change" style={{ color: 'var(--success)' }}>Firma Digital Habilitada</div>
                  </div>
                  <div className="card stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => setIsEditing(true)}>📝 Editar Perfil</button>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>Dirección: {artistProfile.direccion}</div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">📜 Seguimiento de Propuestas y Liquidaciones</div>
                  <div className="card-subtitle">Control de contratos y firmas digitales en Avalanche.</div>
                  
                  <table className="deal-table" style={{ marginTop: '1.5rem' }}>
                    <thead>
                      <tr>
                        <th>Evento / Show</th>
                        <th>Monto Neto</th>
                        <th>Estado</th>
                        <th>Acción / Feedback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userContracts.map((c, i) => (
                        <tr key={i} style={{ borderLeft: c.status === 'Funded' ? '4px solid var(--primary)' : 'none' }}>
                          <td><strong>{c.show_name}</strong></td>
                          <td style={{ fontWeight: 600, color: 'var(--success)' }}>{(c.amount * 0.952).toFixed(6)} AVAX</td>
                          <td>
                             <span className={`badge ${
                               c.status === 'Rejected' ? 'badge-cancelled' : 
                               c.status === 'Funded' ? 'badge-funded' : 
                               c.status === 'Signed' ? 'badge-released' :
                               c.status === 'Confirmed' ? 'badge-confirmed' : 'badge-released'
                             }`}>
                               {c.status === 'Funded' ? 'Pendiente Firma' : 
                                c.status === 'Signed' ? 'Firmado' :
                                c.status === 'Confirmed' ? 'Esperando Pago' : 
                                c.status === 'Rejected' ? 'Rechazado' : 'Liquidado'}
                             </span>
                          </td>
                          <td>
                            {c.status === 'Funded' && (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-sm btn-primary" onClick={() => { setSelectedContractForSign(c); setShowFullContract(true); }}>Firmar Contrato</button>
                                <button className="btn btn-sm btn-ghost" onClick={() => setRejectingContractId(c.id)}>Rechazar</button>
                              </div>
                            )}
                            {c.status === 'Signed' && (
                              <button className="btn btn-sm btn-primary" style={{ background: 'var(--success)' }} onClick={() => handleConfirmPerformance(c.id)}>
                                Confirmar Actuación
                              </button>
                            )}
                            {c.status === 'Rejected' && (
                              <span style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-mid)' }}>
                                {c.rejection_reason}
                              </span>
                            )}
                            {c.status !== 'Rejected' && (
                               <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                 <a 
                                   href={`${SNOWTRACE_BASE}${CONTRACT_ADDRESS}`} 
                                   target="_blank" 
                                   rel="noreferrer"
                                   className="btn btn-sm btn-ghost"
                                   style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                   title="Ver en Avalanche Explorer"
                                 >
                                   🔗 <span style={{ fontSize: '0.6rem' }}>Explorer</span>
                                 </a>
                                 <button 
                                   className="btn btn-sm btn-ghost" 
                                   style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }} 
                                   onClick={() => handleDownloadPDF(c)}
                                   title="Descargar Contrato PDF"
                                 >
                                   📥 <span style={{ fontSize: '0.6rem' }}>PDF</span>
                                 </button>
                               </div>
                            )}
                            {c.status === 'Released' && (
                              <button className="btn btn-sm btn-primary" style={{ background: 'var(--warning)', marginTop: '0.25rem', width: '100%', fontSize: '0.7rem' }} onClick={() => handleRequestFiat(c.id)}>
                                🏦 Liquidar a CBU/CVU
                              </button>
                            )}
                            {c.status === 'FiatPending' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--warning)', display: 'block', marginTop: '0.25rem' }}>
                                ⏳ Procesando transferencia...
                              </span>
                            )}
                            {c.status === 'FiatSettled' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 'bold', display: 'block', marginTop: '0.25rem' }}>
                                ✅ Depositado en Banco
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {userContracts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                      <h3>Sin contratos registrados</h3>
                      <p>Las propuestas enviadas por las productoras aparecerán aquí.</p>
                    </div>
                  )}

                  {/* Modals for Action (Rejecting) */}
                  {rejectingContractId && (
                    <div className="animate-in" style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--error-dim)' }}>
                      <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 700 }}>Motivo del rechazo:</label>
                      <textarea 
                        className="input" 
                        style={{ width: '100%', minHeight: '100px', marginBottom: '1rem', background: 'var(--surface)', color: 'white', border: '1px solid var(--border)' }}
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        placeholder="Explica por qué rechazas esta propuesta (monto, fecha, etc)..."
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-sm btn-primary" style={{ background: 'var(--error)' }} onClick={handleRejectContract}>Confirmar Rechazo</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => setRejectingContractId(null)}>Cancelar</button>
                      </div>
                    </div>
                  )}

                  {/* Modal Legal */}
                  {showFullContract && selectedContractForSign && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', backdropFilter: 'blur(10px)' }}>
                      <div className="animate-in" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="contract-paper">
                          <div className="contract-watermark">
                            {selectedContractForSign.status === 'Signed' || selectedContractForSign.status === 'Released' ? 'FIRMADO' : 'BORRADOR'}
                          </div>
                          
                          <div className="contract-header">
                            <div className="contract-title">Instrumento Legal de Contratación</div>
                            <div style={{ fontSize: '0.7rem', marginTop: '0.5rem', color: '#666' }}>Expediente Digital: {selectedContractForSign.ipfs_hash?.toUpperCase()}</div>
                          </div>

                          <div className="contract-body">
                            {(CONTRACT_TEMPLATES.find(t => t.id === selectedContractForSign.template_id) || CONTRACT_TEMPLATES[0]).text
                              .replace(/{{name}}/g, artistProfile?.name || '...')
                              .replace(/{{dni}}/g, artistProfile?.dni || '...')
                              .replace(/{{cuit}}/g, artistProfile?.cuit || '...')
                              .replace(/{{direccion}}/g, artistProfile?.direccion || '...')
                              .replace(/{{amount}}/g, selectedContractForSign.amount.toString())
                              .replace(/{{show_name}}/g, selectedContractForSign.show_name || 'Evento')
                              .replace(/{{show_date}}/g, selectedContractForSign.fecha_show ? new Date(selectedContractForSign.fecha_show).toLocaleDateString() : '...')
                              .replace(/{{location}}/g, 'Salta, Argentina')
                            }
                          </div>

                          <div className="signature-section">
                            <div className="signature-box">
                              <div className="signature-seal">Firmado Digitalmente via Avalanche</div>
                              Por LA PRODUCTORA
                            </div>
                            <div className="signature-box">
                              {selectedContractForSign.status === 'Signed' && <div className="signature-seal">ID: {shortAddr(account || '')}</div>}
                              Por EL ARTISTA
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                          {selectedContractForSign.status === 'Funded' && (
                            <button className="btn btn-primary btn-lg" onClick={() => handleSignContract(selectedContractForSign.id)}>ACEPTO Y FIRMO DIGITALMENTE</button>
                          )}
                          <button className="btn btn-ghost btn-lg" onClick={() => { setShowFullContract(false); setSelectedContractForSign(null); }}>Cerrar Vista</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CONTROL ── */}
        {activeTab === 'control' && (
          <div className="animate-in">
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
                                  c.status === 'Released' ? 'Firmado / En Garantía' : c.status}
                              </span>
                            </td>
                             <td>
                               <div style={{ display: 'flex', gap: '0.5rem' }}>
                                 <button className="btn btn-sm btn-ghost" disabled>👁️ Vista Auditoría</button>
                                 <a 
                                   href={`${SNOWTRACE_BASE}${CONTRACT_ADDRESS}`} 
                                   target="_blank" 
                                   rel="noreferrer"
                                   className="btn btn-sm btn-ghost"
                                   style={{ padding: '0.4rem' }}
                                   title="Ver en Avalanche Explorer"
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

                  {/* ELIMINADO MODAL DE AUDITORÍA */}
                </div>
              </div>
            )}

        {/* ── BANCO / ENTIDAD FINANCIERA ── */}
        {activeTab === 'banco' && (
          <div className="animate-in">
                <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                  <div className="card stat-card">
                    <div className="stat-label">Solicitudes Pendientes</div>
                    <div className="stat-value">{allContracts.filter(c => c.status === 'FiatPending').length}</div>
                    <div className="stat-change">Off-Ramp Requerido</div>
                  </div>
                  <div className="card stat-card">
                    <div className="stat-label">Liquidaciones Procesadas</div>
                    <div className="stat-value" style={{ color: 'var(--success)' }}>
                      {allContracts.filter(c => c.status === 'FiatSettled').length}
                    </div>
                    <div className="stat-change">Completadas a Fiat</div>
                  </div>
                  <div className="card stat-card">
                    <div className="stat-label">Compliance Fiscal</div>
                    <div className="stat-value" style={{ color: 'var(--primary)' }}>ARCA OK</div>
                    <div className="stat-change">Impuestos Retenidos</div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">🏦 Panel de Liquidación Bancaria (Off-Ramp)</div>
                  <div className="card-subtitle">Conversión de fondos on-chain a cuenta bancaria del artista.</div>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table className="deal-table">
                      <thead>
                        <tr>
                          <th>Fecha Solicitud</th>
                          <th>Artista / Beneficiario</th>
                          <th>Monto a Liquidar</th>
                          <th>Estado Blockchain</th>
                          <th>Cumplimiento</th>
                          <th>Acción / Transferencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allContracts.filter(c => c.status === 'FiatPending' || c.status === 'FiatSettled').map((c, i) => (
                          <tr key={i} style={{ borderLeft: c.status === 'FiatPending' ? '4px solid var(--warning)' : '4px solid var(--success)' }}>
                            <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                            <td>
                              <strong>{shortAddr(c.artist_wallet)}</strong>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>CUIT: Verificado</div>
                            </td>
                            <td style={{ fontWeight: 600 }}>{(c.amount * 0.952).toFixed(6)} AVAX</td>
                            <td>
                              <span className={`badge ${c.status === 'FiatPending' ? 'badge-funded' : 'badge-released'}`}>
                                 {c.status === 'FiatPending' ? 'Esperando Transferencia' : 'Liquidado a CBU'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Retenciones ARCA (4.8%) Ejecutadas en Escrow</span>
                            </td>
                             <td>
                               {c.status === 'FiatPending' ? (
                                 <button 
                                   className="btn btn-sm btn-primary" 
                                   onClick={() => handleSettleFiat(c.id)}
                                 >
                                   Aprobar y Transferir Fiat
                                 </button>
                               ) : (
                                 <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 'bold' }}>✅ Comprobante Emitido</span>
                               )}
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {allContracts.filter(c => c.status === 'FiatPending' || c.status === 'FiatSettled').length === 0 && (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏦</div>
                      <h3>Sin solicitudes de liquidación</h3>
                      <p>Los artistas pueden solicitar su dinero fiat una vez que sus contratos estén ejecutados en blockchain.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
