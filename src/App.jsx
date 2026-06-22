import { useState, useEffect, useRef } from 'react'
import './App.css'
import { openContractCall } from '@stacks/connect'
import { uintCV, stringAsciiCV } from '@stacks/transactions'
import { createNetwork } from '@stacks/network'

// ── Celo Payment Contract Configuration ──
const CONTRACT_ADDRESS = '0x20FFa15Ca89AfA1b855fD2ff4f0A4D453FfB0C10'
const SCAN_FEE_SELECTOR = '0xf71d1732' // scanFee() view function selector
const PAY_SCAN_SELECTOR = '0x0752a777' // payScan() payable function selector

// ── cUSD fee currency address (Celo Mainnet) ──
// Required by MiniPay to pay gas fees in cUSD instead of CELO
const CUSD_FEE_CURRENCY = '0x765DE816845861e75A25fCA122bb6898B8B1282a'

// ── MiniPay Detection ──
const isMiniPay = typeof window !== 'undefined' &&
  window.ethereum?.isMiniPay === true

const CHAINS = [
  { id: 'ethereum', label: 'Ethereum', placeholder: '0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e' },
  { id: 'bnb',      label: 'BNB',      placeholder: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' },
  { id: 'solana',   label: 'Solana',   placeholder: 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm' },
  { id: 'bitcoin',  label: 'Bitcoin',  placeholder: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
  { id: 'celo',     label: 'Celo',     placeholder: '0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e' },
]

const SAMPLE_WALLETS = {
  ethereum: '0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e',
  bnb:      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  solana:   'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm',
  bitcoin:  'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
}

// ── SVG Icon Components ──

const EthereumIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L5 12.5L12 15.5L19 12.5L12 2Z" fill="#3b82f6" opacity="0.8"/>
    <path d="M12 15.5L5 12.5L12 22L19 12.5L12 15.5Z" fill="#60a5fa"/>
    <path d="M12 2L12 9.5L18.5 12.5L12 2Z" fill="#93c5fd" opacity="0.6"/>
    <path d="M12 9.5L5.5 12.5L12 2L12 9.5Z" fill="#ffffff" opacity="0.9"/>
  </svg>
)

const BnbIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#F0B90B">
    <path d="M12 2L14.5 4.5L9 10L6.5 7.5L12 2Z"/>
    <path d="M16.5 6.5L19 9L12 16L5 9L7.5 6.5L12 11.5L16.5 6.5Z"/>
    <path d="M19 11.5L21.5 14L12 22L2.5 14L5 11.5L12 18L19 11.5Z"/>
    <path d="M12 2L9.5 4.5L12 7L14.5 4.5L12 2Z"/>
  </svg>
)

const SolanaIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M4 6H20L16.5 9.5H4V6Z" fill="#9945FF"/>
    <path d="M4 14.5H20L16.5 18H4V14.5Z" fill="#14F195"/>
    <path d="M16.5 10.5H4V14H16.5L20 10.5H16.5Z" fill="#00C2FF"/>
  </svg>
)

const BitcoinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#F7931A"/>
    <path d="M22.31 15.65c-.27-1.82-1.76-2.82-3.8-3.13l.77-3.1-1.89-.47-.76 3.07c-.5-.12-1-.24-1.5-.36l.77-3.07-1.89-.47-.77 3.1c-.4-.1-1.1-.22-1.8-.35l0-.01-2.6-.65-.5 2.02s1.4.32 1.37.34c.76.19.9.07.87.27l-.88 3.55c.05.01.12.03.2.05l-.2-.05-.88 3.53c-.09.23-.33.58-.86.44.02.03-1.37-.34-1.37-.34l-.94 2.16 2.45.61c.46.12.9.23 1.34.34l-.77 3.12 1.89.47.77-3.1c.52.14 1.02.27 1.51.39l-.77 3.1 1.89.47.78-3.13c3.22.49 5.64.3 6.66-2.55.82-2.29-.04-3.61-1.7-4.47 1.21-.28 2.12-1.07 2.36-2.72zm-4.22 5.93c-.58 2.34-4.53 1.08-5.81.76l1.04-4.16c1.28.32 5.38.95 4.77 3.4zm.66-5.96c-.53 2.14-3.82 1.05-4.89.78l.94-3.77c1.07.27 4.5.76 3.95 2.99z" fill="#FFFFFF"/>
  </svg>
)

const CeloIcon = () => (
  <svg width="20" height="20" viewBox="0 0 100 100" fill="none" style={{ borderRadius: '4px' }}>
    <rect width="100" height="100" fill="#FFF53F"/>
    <rect x="25" y="25" width="50" height="50" fill="#000000"/>
    <circle cx="50" cy="50" r="20" fill="#FFF53F"/>
    <rect x="65" y="40" width="10" height="20" fill="#FFF53F"/>
  </svg>
)

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  </svg>
)

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35"/>
  </svg>
)

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)

const ArrowUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
    <path d="M12 19V5M5 12l7-7 7 7"/>
  </svg>
)

const PaperclipIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
  </svg>
)

const SpeakerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
)

const SpeakerMuteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
)

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
)

const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
)

const ShieldIcon = () => (
  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 16px', display: 'block' }}>
    <defs>
      <linearGradient id="leftGrad" x1="12" y1="2" x2="3" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3b82f6" />
        <stop offset="1" stopColor="#1d4ed8" />
      </linearGradient>
      <linearGradient id="rightGrad" x1="12" y1="2" x2="21" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fb923c" />
        <stop offset="1" stopColor="#ea580c" />
      </linearGradient>
    </defs>
    <path d="M12 22C12 22 3 17 3 11V5L12 2V22Z" fill="url(#leftGrad)" opacity="0.9" />
    <path d="M12 22C12 22 21 17 21 11V5L12 2V22Z" fill="url(#rightGrad)" opacity="0.95" />
    <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const CHAIN_ICONS = {
  ethereum: <EthereumIcon />,
  bnb: <BnbIcon />,
  solana: <SolanaIcon />,
  bitcoin: <BitcoinIcon />,
  celo: <CeloIcon />
}

function getRiskClass(score) {
  if (score <= 25) return 'safe'
  if (score <= 50) return 'caution'
  if (score <= 75) return 'danger'
  return 'critical'
}

function getRiskLabel(score) {
  if (score <= 25) return 'Safe'
  if (score <= 50) return 'Caution'
  if (score <= 75) return 'Suspicious'
  return 'Dangerous'
}

function getAlertDot(type) {
  if (type === 'safe') return 'safe'
  if (type === 'warn') return 'warn'
  if (type === 'danger') return 'danger'
  if (type === 'critical') return 'critical'
  return 'info'
}

export default function App() {
  const [chain, setChain]       = useState(isMiniPay ? 'celo' : 'ethereum')
  const [wallet, setWallet]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer]     = useState('')
  const [asking, setAsking]     = useState(false)
  const [miniPayAddress, setMiniPayAddress] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const audioRef = useRef(null)
  const utteranceRef = useRef(null)

  // ── Bug Report States & Handlers ──
  const [isBugModalOpen, setIsBugModalOpen] = useState(false)
  const [bugEmail, setBugEmail]             = useState('')
  const [bugCategory, setBugCategory]       = useState('UI/UX')
  const [bugSeverity, setBugSeverity]       = useState('Medium')
  const [bugTitle, setBugTitle]             = useState('')
  const [bugDesc, setBugDesc]               = useState('')
  const [bugSubmitting, setBugSubmitting]   = useState(false)
  const [bugSuccess, setBugSuccess]         = useState(false)
  const [bugError, setBugError]             = useState('')

  const openBugModal = () => {
    setIsBugModalOpen(true)
    setBugEmail('')
    setBugCategory('UI/UX')
    setBugSeverity('Medium')
    setBugTitle('')
    setBugDesc('')
    setBugSuccess(false)
    setBugError('')
  }

  const submitBugReport = async () => {
    if (!bugTitle.trim() || !bugDesc.trim()) return
    setBugSubmitting(true)
    setBugError('')
    try {
      const response = await fetch('/api/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bugTitle.trim(),
          description: bugDesc.trim(),
          category: bugCategory,
          severity: bugSeverity,
          email: bugEmail.trim()
        })
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setBugSuccess(true)
      } else {
        setBugError(data.error || 'Failed to submit bug report. Please try again.')
      }
    } catch (e) {
      console.error('Bug report submission failed:', e)
      setBugError('Network error. Failed to reach server.')
    }
    setBugSubmitting(false)
  }

  // Helper to split text into chunks of max maxLength characters (splitting at spaces)
  const chunkText = (text, maxLength = 150) => {
    const words = text.split(' ')
    const chunks = []
    let currentChunk = ''

    for (const word of words) {
      if ((currentChunk + word).length + 1 > maxLength) {
        if (currentChunk) chunks.push(currentChunk.trim())
        currentChunk = word
      } else {
        currentChunk += (currentChunk ? ' ' : '') + word
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim())
    return chunks
  }

  // Toggle speaking the summary using window.speechSynthesis or backend audio fallback
  const speakSummary = () => {
    const textToSpeak = result?.summary || ''
    if (!textToSpeak) return

    // Stop speaking if currently active
    if (speaking) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setSpeaking(false)
      return
    }

    // Attempt native SpeechSynthesis if supported (and not inside restricted MiniPay/WebView)
    const isSpeechSynthesisSupported = 
      typeof window !== 'undefined' && 
      'speechSynthesis' in window && 
      !isMiniPay; // Force fallback in MiniPay since WebView WebSpeech is typically absent/broken

    if (isSpeechSynthesisSupported) {
      try {
        window.speechSynthesis.cancel() // Clear any jammed queue

        const utterance = new SpeechSynthesisUtterance(textToSpeak)
        utteranceRef.current = utterance // Save ref to prevent garbage collection

        utterance.onend = () => {
          setSpeaking(false)
          utteranceRef.current = null
        }
        utterance.onerror = (e) => {
          console.error("SpeechSynthesis error:", e)
          setSpeaking(false)
          utteranceRef.current = null
        }

        setSpeaking(true)
        window.speechSynthesis.speak(utterance)
      } catch (err) {
        console.warn("SpeechSynthesis failed, trying fallback TTS:", err)
        playFallbackAudio(textToSpeak)
      }
    } else {
      // Fallback path using backend /api/tts endpoint and HTML5 Audio
      playFallbackAudio(textToSpeak)
    }
  }

  // Sequentially play text chunks using the backend TTS proxy and HTML5 Audio
  const playFallbackAudio = (text) => {
    const chunks = chunkText(text, 150)
    if (chunks.length === 0) return

    let currentIndex = 0
    setSpeaking(true)

    const playNext = () => {
      if (currentIndex >= chunks.length) {
        setSpeaking(false)
        audioRef.current = null
        return
      }

      const chunk = chunks[currentIndex]
      const url = `/api/tts?text=${encodeURIComponent(chunk)}`
      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => {
        currentIndex++
        playNext()
      }

      audio.onerror = (e) => {
        console.error("HTML5 Audio fallback playback error:", e)
        setSpeaking(false)
        audioRef.current = null
      }

      audio.play().catch(err => {
        console.error("HTML5 Audio play() rejected:", err)
        setSpeaking(false)
        audioRef.current = null
      })
    }

    playNext()
  }

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  // Cancel speech when result changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setSpeaking(false)
  }, [result])

  // ── Payment & Contract State ──
  const [scanFeeWei, setScanFeeWei]   = useState('10000000000000000') // Default: 0.01 CELO
  const [scanFeeCelo, setScanFeeCelo] = useState('0.01')
  const [paying, setPaying]           = useState(false)
  const [loggingStacks, setLoggingStacks] = useState(false)
  const [stacksTxId, setStacksTxId] = useState('')
  const [resultTab, setResultTab] = useState('security') // 'security' | 'transactions'
  const [txHistory, setTxHistory] = useState([])
  const [txLoading, setTxLoading] = useState(false)
  const [txError, setTxError] = useState('')

  // ── Multi-Wallet Dashboard State & Handlers ──
  const [trackedWallets, setTrackedWallets] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('txguard_tracked_wallets');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [
      {
        id: '1',
        label: 'Main Ethereum Wallet',
        address: '0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e',
        chain: 'ethereum',
        balance: '1.24 ETH',
        riskScore: 12,
        riskLabel: 'Safe'
      },
      {
        id: '2',
        label: 'MiniPay Savings Account',
        address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        chain: 'celo',
        balance: '150.00 CELO',
        riskScore: 24,
        riskLabel: 'Safe'
      }
    ];
  });
  
  const [activeTab, setActiveTab] = useState('scan');
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [newWalletLabel, setNewWalletLabel] = useState('');
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletChain, setNewWalletChain] = useState('ethereum');
  const [isRefreshingDashboard, setIsRefreshingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState('');

  const handleAddWallet = () => {
    if (!newWalletLabel.trim() || !newWalletAddress.trim()) return;
    setDashboardError('');
    
    if (!isValidAddress(newWalletAddress.trim(), newWalletChain)) {
      const chainName = CHAINS.find(c => c.id === newWalletChain)?.label || newWalletChain;
      setDashboardError(`Invalid address for ${chainName}.`);
      return;
    }
    const newWallet = {
      id: Date.now().toString(),
      label: newWalletLabel.trim(),
      address: newWalletAddress.trim(),
      chain: newWalletChain,
      balance: '',
      riskScore: null,
      riskLabel: ''
    };
    const updated = [newWallet, ...trackedWallets];
    setTrackedWallets(updated);
    localStorage.setItem('txguard_tracked_wallets', JSON.stringify(updated));
    setIsAddingWallet(false);
  };

  const handleRemoveWallet = (id) => {
    const updated = trackedWallets.filter(w => w.id !== id);
    setTrackedWallets(updated);
    localStorage.setItem('txguard_tracked_wallets', JSON.stringify(updated));
  };

  const handleScanFromDashboard = (address, targetChain) => {
    setWallet(address);
    setChain(targetChain);
    setActiveTab('scan');
    analyze(address, targetChain);
  };

  const refreshDashboardWallets = async () => {
    if (trackedWallets.length === 0) return;
    setIsRefreshingDashboard(true);
    const updated = [...trackedWallets];
    
    for (let i = 0; i < updated.length; i++) {
      const w = updated[i];
      try {
        const body = { wallet: w.address, chain: w.chain };
        
        if (w.chain === 'celo') {
          updated[i].balance = '0.00 CELO';
          updated[i].riskScore = 15;
          updated[i].riskLabel = 'Safe';
          continue;
        }

        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        if (res.ok) {
          const data = await res.json();
          updated[i].balance = data.balance;
          updated[i].riskScore = data.riskScore;
          updated[i].riskLabel = data.riskLabel;
        }
      } catch (err) {
        console.warn(`Failed to refresh dashboard wallet ${w.address}:`, err);
      }
    }
    
    setTrackedWallets(updated);
    localStorage.setItem('txguard_tracked_wallets', JSON.stringify(updated));
    setIsRefreshingDashboard(false);
  };

  async function logScanToStacks(targetChain, targetWallet, targetResult) {
    const activeChain = (typeof targetChain === 'string') ? targetChain : chain
    const activeWallet = (typeof targetWallet === 'string') ? targetWallet : wallet
    const activeResult = (targetResult && typeof targetResult === 'object') ? targetResult : result

    if (!activeResult) return
    setLoggingStacks(true)
    try {
      const myAddress = "SP3QKY6WR398BJHPP23VKKEQXQ0T1H1HAQ1BKQFKM"
      const network = createNetwork('mainnet')
      
      openContractCall({
        network,
        contractAddress: myAddress,
        contractName: 'registry',
        functionName: 'log-scan',
        functionArgs: [
          stringAsciiCV(activeChain),
          stringAsciiCV(activeWallet.trim()),
          uintCV(activeResult.riskScore)
        ],
        appDetails: {
          name: 'TxGuard',
          icon: window.location.origin + '/logo.png?v=2',
        },
        onFinish: (data) => {
          setStacksTxId(data.txId)
          setLoggingStacks(false)
        },
        onCancel: () => {
          setLoggingStacks(false)
        }
      })
    } catch (e) {
      console.error('Stacks logging failed:', e)
      setLoggingStacks(false)
    }
  }

  async function fetchTransactions(addr, ch) {
    setTxLoading(true)
    setTxError('')
    try {
      const response = await fetch(`/api/transactions?wallet=${addr}&chain=${ch}`)
      const data = await response.json()
      if (response.ok) {
        setTxHistory(data.transactions || [])
      } else {
        setTxError(data.error || 'Failed to load transactions.')
      }
    } catch (e) {
      console.error('Fetch transactions failed:', e)
      setTxError('Failed to load transactions.')
    }
    setTxLoading(false)
  }

  // ── Fetch Scan Fee from Contract on Mount ──
  useEffect(() => {
    async function loadFee() {
      if (window.ethereum) {
        try {
          const res = await window.ethereum.request({
            method: 'eth_call',
            params: [{
              to: CONTRACT_ADDRESS,
              data: SCAN_FEE_SELECTOR
            }, 'latest']
          })
          if (res && res !== '0x') {
            const wei = BigInt(res)
            setScanFeeWei(wei.toString())
            const celoVal = Number(wei) / 1e18
            setScanFeeCelo(celoVal.toString())
          }
        } catch (e) {
          console.warn('Failed to fetch fee from Celo contract:', e)
        }
      }
    }
    loadFee()
  }, [])

  // ── Auto-detect MiniPay wallet address ──
  useEffect(() => {
    if (isMiniPay && window.ethereum) {
      window.ethereum.request({ method: 'eth_requestAccounts' })
        .then(accounts => {
          if (accounts[0]) {
            setMiniPayAddress(accounts[0])
            setWallet(accounts[0])
            setChain('celo')
          }
        })
        .catch(err => console.warn('MiniPay wallet fetch failed:', err))
    }
  }, [])

  const selectedChain = CHAINS.find(c => c.id === chain)

  async function analyze(overrideWallet = null, overrideChain = null) {
    const targetWallet = (overrideWallet || wallet).trim()
    const targetChain = overrideChain || chain
    if (!targetWallet) return

    // Address validation check
    if (!isValidAddress(targetWallet, targetChain)) {
      const chainName = CHAINS.find(c => c.id === targetChain)?.label || targetChain;
      setError(`Invalid address format for ${chainName}. Please check and try again.`);
      return;
    }

    setResult(null); setError(''); setAnswer(''); setStacksTxId('')

    const targetAddress = targetWallet.toLowerCase()
    let txHash = null

    // ── Payment Check (Required for all scans) ──
    if (true) {
      if (!txHash) {
        setPaying(true)
        let userAddress = miniPayAddress
        if (!userAddress && window.ethereum) {
          try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
            userAddress = accounts[0]
            setMiniPayAddress(userAddress)
          } catch (e) {
            setError('Wallet connection required for payment.')
            setPaying(false)
            return
          }
        }
        if (!userAddress) {
          setError('No Celo wallet detected. Please open inside MiniPay or install a Web3 wallet.')
          setPaying(false)
          return
        }

        try {
          let txValue = BigInt(scanFeeWei)
          // Safety Fallback: Ensure value is at least 0.01 CELO (10^16 wei)
          if (txValue < 10000000000000000n) {
            txValue = 10000000000000000n
          }

          // Only switch chain if NOT inside MiniPay
          if (!isMiniPay) {
            try {
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xA4EC' }],
              })
            } catch (switchError) {
              if (switchError.code === 4902) {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: '0xA4EC',
                    chainName: 'Celo Mainnet',
                    nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
                    rpcUrls: ['https://forno.celo.org'],
                    blockExplorerUrls: ['https://celoscan.io']
                  }]
                })
                await window.ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: '0xA4EC' }],
                })
              } else {
                throw switchError
              }
            }
          }

          txHash = null

          if (isMiniPay) {
            // MiniPay: pay gas in native CELO directly
            // Skip cUSD feeCurrency attempt entirely
            txHash = await window.ethereum.request({
              method: 'eth_sendTransaction',
              params: [{
                from: userAddress,
                to: CONTRACT_ADDRESS,
                value: '0x' + txValue.toString(16),
                data: PAY_SCAN_SELECTOR
              }]
            })
          } else {
            // Non-MiniPay: try cUSD first, fallback to CELO
            try {
              txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [{
                  from: userAddress,
                  to: CONTRACT_ADDRESS,
                  value: '0x' + txValue.toString(16),
                  data: PAY_SCAN_SELECTOR,
                  feeCurrency: CUSD_FEE_CURRENCY
                }]
              })
            } catch (feeError) {
              const msg = (feeError.message || '').toLowerCase()
              const isUserRejection =
                msg.includes('reject') ||
                msg.includes('deny') ||
                msg.includes('cancel') ||
                msg.includes('user denied')
              if (!isUserRejection) {
                txHash = await window.ethereum.request({
                  method: 'eth_sendTransaction',
                  params: [{
                    from: userAddress,
                    to: CONTRACT_ADDRESS,
                    value: '0x' + txValue.toString(16),
                    data: PAY_SCAN_SELECTOR
                  }]
                })
              } else {
                throw feeError
              }
            }
          }

          // Poll for receipt
          let confirmed = false
          const maxAttempts = 15
          for (let i = 0; i < maxAttempts; i++) {
            const receipt = await window.ethereum.request({
              method: 'eth_getTransactionReceipt',
              params: [txHash]
            })
            if (receipt) {
              if (
                receipt.status === '0x1' ||
                receipt.status === '0x01' ||
                receipt.status === 1 ||
                receipt.status === true
              ) {
                confirmed = true
                break
              } else {
                throw new Error('Payment transaction reverted on-chain.')
              }
            }
            await new Promise(r => setTimeout(r, 2000))
          }
          if (!confirmed) {
            throw new Error('Payment transaction timed out. Please check Celoscan.')
          }

          setPaying(false)
        } catch (e) {
          console.error('Payment failed:', e)
          const msg = (e.message || '').toLowerCase()
          if (
            msg.includes('insufficient') || 
            msg.includes('funds') || 
            msg.includes('balance') ||
            msg.includes('cusd') ||
            msg.includes('fee')
          ) {
            setError('Insufficient balance. Please make sure you have at least 0.01 CELO or cUSD in your wallet to pay for the scan.')
          } else if (msg.includes('rejected') || msg.includes('denied') || msg.includes('user denied')) {
            setError('Payment was cancelled.')
          } else {
            setError(e.message || 'Payment transaction rejected or failed.')
          }
          setPaying(false)
          return
        }
      }
    }

    setLoading(true)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: targetWallet, chain: targetChain, txHash })
      })
      const data = await response.json()
      if (response.ok) {
        setResult(data)
        setResultTab('security')
        fetchTransactions(targetWallet, targetChain)
        // Automatically prompt to log scan to Stacks Registry on mainnet (if not in MiniPay)
        if (!isMiniPay) {
          setTimeout(() => {
            logScanToStacks(targetChain, targetWallet, data)
          }, 800)
        }
      } else {
        setError(data.error || 'Server returned an error. Please try again.')
      }
    } catch (e) {
      console.error('Scan request failed:', e)
      setError('Failed to reach backend server. Please try again.')
    }
    setLoading(false)
  }

  async function askQuestion(q) {
    if (!result || !q.trim()) return
    setAsking(true); setAnswer('')
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: wallet.trim(),
          chain,
          riskScore: result.riskScore,
          riskLabel: result.riskLabel,
          summary: result.summary,
          question: q.trim()
        })
      })
      const data = await response.json()
      if (response.ok) {
        setAnswer(data.answer)
      } else {
        setAnswer(data.error || 'Failed to get answer. Please try again.')
      }
    } catch (e) {
      console.error('Ask request failed:', e)
      setAnswer('Failed to reach server. Please try again.')
    }
    setAsking(false)
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setWallet(text.trim())
    } catch (e) {
      console.warn('Clipboard read failed:', e)
    }
  }

  const handleQuickChip = (action) => {
    if (action === 'safe') {
      if (result) {
        setQuestion('Is this wallet safe to receive from?')
        askQuestion('Is this wallet safe to receive from?')
      } else {
        const defaultAddr = SAMPLE_WALLETS[chain] || '0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e'
        setWallet(defaultAddr)
        setTimeout(() => {
          analyze()
        }, 50)
      }
    } else {
      if (wallet.trim()) {
        analyze()
      } else {
        const defaultAddr = SAMPLE_WALLETS[chain] || '0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e'
        setWallet(defaultAddr)
        setTimeout(() => {
          analyze()
        }, 50)
      }
    }
  }

  // ── Render Helpers for Result Cards, Loaders, Error & Empty States ──

  const renderResults = () => {
    if (!result) return null
    return (
      <div className="result-card">
        <div className="results-tab-header">
          <button 
            className={`results-tab-btn ${resultTab === 'security' ? 'active' : ''}`}
            onClick={() => setResultTab('security')}
          >
            Security Report
          </button>
          <button 
            className={`results-tab-btn ${resultTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setResultTab('transactions')}
          >
            Transaction History
          </button>
        </div>

        {resultTab === 'security' ? (
          <>
            <div className="score-wrap">
              <div className="score-num">{result.riskScore}</div>
              <div className={`score-tag ${getRiskClass(result.riskScore)}`}>
                {getRiskLabel(result.riskScore)}
              </div>
            </div>

            <div className="score-bar-track">
              <div className="score-bar-fill" style={{ width: `${result.riskScore}%` }}></div>
            </div>

            {result.paymentTx && (
              <div className="payment-receipt-badge">
                <span className="receipt-icon">⚡</span>
                <span className="receipt-text">
                  On-Chain Scan Receipt:{" "}
                  <a
                    href={`https://celoscan.io/tx/${result.paymentTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="receipt-link"
                  >
                    {result.paymentTx.slice(0, 10)}...{result.paymentTx.slice(-8)} ↗
                  </a>
                </span>
              </div>
            )}

            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              {stacksTxId ? (
                <div className="payment-receipt-badge" style={{ backgroundColor: '#ecfdf5', color: '#10b981', border: '1px solid #d1fae5' }}>
                  <span className="receipt-icon">🟩</span>
                  <span className="receipt-text">
                    Logged to Stacks Mainnet:{" "}
                    <a
                      href={`https://explorer.hiro.so/txid/${stacksTxId}?chain=mainnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="receipt-link"
                      style={{ color: '#10b981', fontWeight: 'bold' }}
                    >
                      {stacksTxId.slice(0, 10)}...{stacksTxId.slice(-8)} ↗
                    </a>
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => logScanToStacks(chain, wallet, result)}
                  disabled={loggingStacks}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#5546ff',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'opacity 0.2s',
                    fontFamily: 'inherit',
                    opacity: loggingStacks ? 0.6 : 1
                  }}
                >
                  {loggingStacks ? 'Connecting Wallet...' : 'Log Scan to Stacks Mainnet ⚡'}
                </button>
              )}
            </div>

            <div className="stat-grid">
              <div className="stat-box">
                <div className="stat-box-label">Balance</div>
                <div className="stat-box-value">{result.balance}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Transactions</div>
                <div className="stat-box-value">{result.totalTransactions}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Wallet Age</div>
                <div className="stat-box-value">{result.walletAge}</div>
              </div>
            </div>

            <div className="divider"></div>

            <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>AI Summary</span>
              <button 
                onClick={speakSummary}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: speaking ? 'var(--red)' : 'var(--blue-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  borderRadius: '20px',
                  backgroundColor: speaking ? 'var(--red-bg)' : 'var(--blue-bg)',
                  fontSize: '11px',
                  fontWeight: 500,
                  gap: '4px',
                  fontFamily: 'var(--font-ui)'
                }}
                title={speaking ? "Stop reading summary" : "Read summary out loud"}
              >
                {speaking ? <SpeakerMuteIcon /> : <SpeakerIcon />}
                <span>{speaking ? 'Stop' : 'Listen'}</span>
              </button>
            </div>
            <div className="summary-text-box">
              <p className="summary-text">{result.summary}</p>
            </div>

            <div className="divider"></div>

            <div className="section-label">Security Alerts</div>
            <div className="alerts-list">
              {result.alerts?.map((alert, i) => (
                <div key={i} className="alert-item">
                  <div className={`alert-dot ${getAlertDot(alert.type)}`}></div>
                  <div className="alert-content">
                    <div className="alert-title">{alert.title}</div>
                    <div className="alert-text">{alert.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="divider"></div>

            <div className="section-label">Transaction Breakdown</div>
            <div className="categories-list">
              {result.categories?.filter(c => c.count > 0).map((cat, i) => (
                <div key={i} className="bar-row">
                  <span className="bar-label">{cat.name}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${cat.percentage}%` }}></div>
                  </div>
                  <span className="bar-pct">{cat.percentage}%</span>
                </div>
              ))}
            </div>

            <div className="divider"></div>

            <div className="section-label">Recommendations</div>
            <div className="recs-list">
              {result.recommendations?.map((rec, i) => (
                <div key={i} className="rec-item">
                  <span className="rec-num">{i + 1}</span>
                  <span className="rec-text">{rec}</span>
                </div>
              ))}
            </div>

            <div className="divider"></div>

            <div className="section-label">Ask TxGuard AI</div>
            <div className="quick-questions">
              {['Is this wallet safe to receive from?', 'Should I send funds to this address?', 'What are the biggest red flags?'].map(q => (
                <button key={q} className="quick-q" onClick={() => { setQuestion(q); askQuestion(q) }}>
                  {q}
                </button>
              ))}
            </div>
            <div className="ask-row">
              <input
                className="ask-input"
                placeholder="Ask anything about this wallet..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && askQuestion(question)}
              />
              <button className="ask-btn" onClick={() => askQuestion(question)} disabled={asking || !question.trim()}>
                {asking ? '...' : 'Ask'}
              </button>
            </div>
            {asking && <div className="ask-answer thinking">TxGuard is thinking...</div>}
            {answer && !asking && <div className="ask-answer">{answer}</div>}
          </>
        ) : (
          <div className="tx-history-tab">
            <div className="section-label">Recent Transactions</div>
            {txLoading && (
              <div className="tx-loading">
                <div className="loading-spinner small"></div>
                <div>Fetching transaction history...</div>
              </div>
            )}
            {txError && (
              <div className="error-card small">
                <span>⚠</span>
                <span>{txError}</span>
              </div>
            )}
            {!txLoading && !txError && txHistory.length === 0 && (
              <div className="tx-empty-state">
                No recent transactions found for this address.
              </div>
            )}
            {!txLoading && !txError && txHistory.length > 0 && (
              <div className="tx-list">
                {txHistory.map((tx, idx) => (
                  <div key={idx} className="tx-item">
                    <div className="tx-item-header">
                      <span className="tx-item-hash">
                        Tx: <a href={getExplorerTxLink(chain, tx.hash)} target="_blank" rel="noopener noreferrer" className="receipt-link">
                          {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)} ↗
                        </a>
                      </span>
                      <div className="tx-item-status-wrapper">
                        <span className={`tx-status-badge ${tx.status.toLowerCase()}`}>
                          {tx.status}
                        </span>
                        {tx.statusDetails && (
                          <span className="tx-status-details">
                            {tx.statusDetails}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="tx-item-body">
                      <div className="tx-address-row">
                        <div className="tx-address-col">
                          <span className="tx-addr-label">From</span>
                          <span 
                            className="tx-addr-value clickable" 
                            onClick={() => {
                              navigator.clipboard.writeText(tx.from);
                            }}
                            title="Click to copy"
                          >
                            {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                          </span>
                        </div>
                        <div className="tx-arrow-col">➔</div>
                        <div className="tx-address-col">
                          <span className="tx-addr-label">To</span>
                          <span 
                            className="tx-addr-value clickable" 
                            onClick={() => {
                              navigator.clipboard.writeText(tx.to);
                            }}
                            title="Click to copy"
                          >
                            {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                          </span>
                        </div>
                      </div>
                      <div className="tx-info-row">
                        <span className="tx-amount">{tx.amount} {tx.asset}</span>
                        <span className="tx-time">{formatRelativeTime(tx.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderLoading = () => {
    if (!loading) return null
    return (
      <div className="loading-card">
        <div className="loading-spinner"></div>
        <div className="loading-title">Analyzing Wallet</div>
        <div className="loading-sub">TxGuard AI is fetching and scanning security patterns...</div>
      </div>
    )
  }

  const renderPaying = () => {
    if (!paying) return null
    return (
      <div className="loading-card payment-loading-card">
        <div className="loading-spinner"></div>
        <div className="loading-title">Celo Payment Pending</div>
        <div className="loading-sub">Please approve the {scanFeeCelo} CELO scan fee in your MiniPay wallet...</div>
      </div>
    )
  }

  const renderError = () => {
    if (!error) return null
    return (
      <div className="error-card">
        <span>⚠</span>
        <span>{error}</span>
      </div>
    )
  }

  const renderEmptyState = () => {
    if (result || loading || paying || error) return null
    return (
      <div className="empty-state">
        <ShieldIcon />
        <div className="empty-title">Ready to Scan</div>
        <div className="empty-sub">
          {isMiniPay
            ? 'Enter or paste any Celo wallet address above to check it before sending.'
            : 'Enter or paste any wallet address above to get an instant AI security analysis.'}
        </div>
        {!isMiniPay && (
          <div className="sample-wallets">
            {Object.entries(SAMPLE_WALLETS).map(([c, addr]) => (
              <div
                key={c}
                className="sample-wallet"
                onClick={() => {
                  setChain(c)
                  setWallet(addr)
                }}
              >
                {c.toUpperCase()} · {addr.slice(0, 6)}...{addr.slice(-4)}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderBugModal = () => {
    return (
      <div className="modal-overlay" onClick={() => setIsBugModalOpen(false)}>
        <div className="modal-card" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">
              <span style={{ fontSize: '18px' }}>🐛</span> Report a Bug
            </h2>
            <button className="modal-close-btn" onClick={() => setIsBugModalOpen(false)}>✕</button>
          </div>

          {bugSuccess ? (
            <div className="success-view">
              <div className="success-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="success-title">Thank You!</h3>
              <p className="success-desc">
                Your report has been successfully submitted. We appreciate your feedback to help make TxGuard better.
              </p>
              <button 
                className="btn-secondary" 
                style={{ marginTop: '12px', width: '100%', maxWidth: '200px' }} 
                onClick={() => setIsBugModalOpen(false)}
              >
                Close Window
              </button>
            </div>
          ) : (
            <>
              <div className="modal-body">
                <p className="modal-body-sub">
                  Found an issue or something not working quite right? Tell us about it and we'll look into it right away.
                </p>

                {bugError && (
                  <div className="error-card" style={{ maxWidth: '100%', margin: '0 0 12px' }}>
                    <span>⚠</span>
                    <span>{bugError}</span>
                  </div>
                )}

                <div className="form-group">
                  <span className="form-label">Category</span>
                  <div className="category-chips">
                    {['UI/UX', 'Scan Error', 'AI / Ask Summary', 'Payment', 'Other'].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        className={`category-chip ${bugCategory === cat ? 'active' : ''}`}
                        onClick={() => setBugCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <span className="form-label">Severity</span>
                  <div className="severity-selector">
                    {['Low', 'Medium', 'High', 'Critical'].map(sev => (
                      <button
                        key={sev}
                        type="button"
                        className={`severity-btn ${sev.toLowerCase()} ${bugSeverity === sev ? 'active' : ''}`}
                        onClick={() => setBugSeverity(sev)}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="bug-title-input">Bug Title</label>
                  <input
                    id="bug-title-input"
                    className="form-input"
                    placeholder="Short summary of the problem"
                    value={bugTitle}
                    onChange={e => setBugTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="bug-desc-textarea">Description</label>
                  <textarea
                    id="bug-desc-textarea"
                    className="form-textarea"
                    placeholder="What happened? What did you expect to happen? Please provide steps to reproduce."
                    value={bugDesc}
                    onChange={e => setBugDesc(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="bug-email-input">Contact Email (Optional)</label>
                  <input
                    id="bug-email-input"
                    className="form-input"
                    type="email"
                    placeholder="you@example.com"
                    value={bugEmail}
                    onChange={e => setBugEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button"
                  className="btn-secondary" 
                  onClick={() => setIsBugModalOpen(false)}
                  disabled={bugSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  className="btn-primary" 
                  onClick={submitBugReport}
                  disabled={bugSubmitting || !bugTitle.trim() || !bugDesc.trim()}
                >
                  {bugSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  const renderDashboardView = () => {
    return (
      <div className="dashboard-layout">
        <div className="dashboard-header-row">
          <div>
            <h2 className="dashboard-title">Multi-Wallet Dashboard</h2>
            <p className="dashboard-subtitle">Monitor and verify security profiles of your accounts</p>
          </div>
          <button 
            className="dashboard-refresh-btn" 
            onClick={refreshDashboardWallets}
            disabled={isRefreshingDashboard || trackedWallets.length === 0}
          >
            <svg 
              className={`refresh-icon ${isRefreshingDashboard ? 'spinning' : ''}`} 
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l.73-2.73" />
            </svg>
            <span>{isRefreshingDashboard ? 'Refreshing...' : 'Refresh All'}</span>
          </button>
        </div>

        <div className="dashboard-grid">
          {/* Add Wallet Card */}
          {isAddingWallet ? (
            <div className="dashboard-card add-wallet-form-card">
              {dashboardError && (
                <div className="error-card small" style={{ maxWidth: '100%', margin: '0 0 12px', padding: '8px 12px', fontSize: '11px' }}>
                  <span>⚠</span>
                  <span>{dashboardError}</span>
                </div>
              )}
              <h3 className="card-form-title">Track Account</h3>
              <div className="form-group">
                <label className="form-label" htmlFor="dashboard-wallet-label">Label</label>
                <input
                  id="dashboard-wallet-label"
                  className="form-input"
                  placeholder="e.g. My Hot Wallet"
                  value={newWalletLabel}
                  onChange={e => setNewWalletLabel(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="dashboard-wallet-chain">Chain</label>
                <select
                  id="dashboard-wallet-chain"
                  className="form-select form-input"
                  value={newWalletChain}
                  onChange={e => setNewWalletChain(e.target.value)}
                >
                  {CHAINS.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="dashboard-wallet-address">Address</label>
                <input
                  id="dashboard-wallet-address"
                  className="form-input"
                  placeholder="Paste public address"
                  value={newWalletAddress}
                  onChange={e => setNewWalletAddress(e.target.value)}
                />
              </div>
              <div className="card-form-actions">
                <button className="btn-secondary btn-sm" onClick={() => setIsAddingWallet(false)}>Cancel</button>
                <button className="btn-primary btn-sm" onClick={handleAddWallet} disabled={!newWalletLabel.trim() || !newWalletAddress.trim()}>Save</button>
              </div>
            </div>
          ) : (
            <div className="dashboard-card add-wallet-dotted-card" onClick={() => {
              setIsAddingWallet(true);
              setNewWalletLabel('');
              setNewWalletAddress('');
              setNewWalletChain('ethereum');
              setDashboardError('');
            }}>
              <span className="add-dotted-icon">＋</span>
              <span className="add-dotted-text">Track New Account</span>
            </div>
          )}

          {/* Tracked Wallets Cards */}
          {trackedWallets.map(w => (
            <div key={w.id} className="dashboard-card wallet-tracking-card">
              <div className="card-top-row">
                <div className="wallet-chain-badge">
                  {CHAIN_ICONS[w.chain]}
                  <span className="chain-name-text">{CHAINS.find(c => c.id === w.chain)?.label}</span>
                </div>
                <button className="delete-wallet-btn" onClick={() => handleRemoveWallet(w.id)} title="Stop tracking">✕</button>
              </div>
              
              <div className="wallet-label-name">{w.label}</div>
              <div className="wallet-address-value">
                <span>{w.address.slice(0, 8)}...{w.address.slice(-6)}</span>
                <button 
                  className="copy-btn-inline" 
                  onClick={() => navigator.clipboard.writeText(w.address)} 
                  title="Copy address"
                >
                  📋
                </button>
              </div>

              <div className="card-metrics-row">
                <div className="metric-col">
                  <span className="metric-lbl">Balance</span>
                  <span className="metric-val">{w.balance || '—'}</span>
                </div>
                <div className="metric-col">
                  <span className="metric-lbl">Security Status</span>
                  {w.riskLabel ? (
                    <span className={`score-tag inline ${getRiskClass(w.riskScore)}`}>
                      {w.riskLabel} ({w.riskScore})
                    </span>
                  ) : (
                    <span className="score-tag inline unscanned">Unscanned</span>
                  )}
                </div>
              </div>

              <button className="card-scan-now-btn" onClick={() => handleScanFromDashboard(w.address, w.chain)}>
                <span>Scan Wallet</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`app-root ${isMiniPay ? 'force-mobile' : ''}`}>
      {/* ── DESKTOP VIEW SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo.png?v=2" alt="TxGuard Logo" className="logo-img" />
        </div>
        <button
          className={`sidebar-chain-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
          title="Multi-Wallet Dashboard"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
        </button>
        <div style={{ width: '20px', height: '1px', background: '#27272a', margin: '8px 0' }}></div>
        {CHAINS.map(c => (
          <button
            key={c.id}
            className={`sidebar-chain-btn ${activeTab === 'scan' && chain === c.id ? 'active' : ''}`}
            onClick={() => { setChain(c.id); setResult(null); setAnswer(''); setActiveTab('scan') }}
            title={c.label}
          >
            {CHAIN_ICONS[c.id]}
          </button>
        ))}
      </aside>

      {/* ── DESKTOP VIEW MAIN CONTENT ── */}
      <main className="main-content">
        {activeTab === 'dashboard' ? renderDashboardView() : (
          <>
            <h1 className="main-heading">What wallet do you want to scan?</h1>
            <p className="main-subtitle">AI-powered security analysis across 5 chains</p>

            <div className="chain-tabs">
              {CHAINS.map(c => (
                <button
                  key={c.id}
                  className={`chain-tab ${chain === c.id ? 'active' : ''}`}
                  onClick={() => { setChain(c.id); setResult(null); setAnswer('') }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="input-card">
              <div className="input-row">
                <SearchIcon />
                <input
                  className="wallet-input"
                  placeholder={selectedChain.placeholder}
                  value={wallet}
                  disabled={loading || paying}
                  onChange={e => setWallet(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && !paying && analyze()}
                />
                {wallet && !loading && !paying && (
                  <button
                    onClick={() => setWallet('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-hint)',
                      fontSize: '12px',
                      padding: '4px'
                    }}
                  >
                    ✕
                  </button>
                )}
                <button
                  className="scan-btn"
                  onClick={() => analyze()}
                  disabled={loading || paying || !wallet.trim()}
                >
                  <span>{paying ? 'Paying...' : 'Scan'}</span>
                  <ArrowRightIcon />
                </button>
              </div>
              <div className="input-icons">
                <button className="input-icon-btn" onClick={() => setWallet(w => w + '+')}>➕</button>
                <button className="input-icon-btn" onClick={handlePaste} title="Paste"><CopyIcon /></button>
                <button className="input-icon-btn" title="Link"><LinkIcon /></button>
              </div>
            </div>

            <div className="desktop-results">
              {renderPaying()}
              {renderLoading()}
              {renderError()}
              {renderResults()}
              {renderEmptyState()}
            </div>

            <footer className="footer">
              <div className="footer-content">
                <span>TxGuard · AI-Powered Blockchain Security · Know Before You Send</span>
                <span className="footer-divider">·</span>
                <button className="report-bug-btn" onClick={openBugModal}>
                  <svg className="bug-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <path d="M12 2v9M8 3l1 2M16 3l-1 2M4 14H2M22 14h-2M4 18H2M22 18h-2" />
                  </svg>
                  <span>Report a Bug</span>
                </button>
              </div>
            </footer>
          </>
        )}
      </main>

      {/* ── MOBILE / MINIPAY VIEW WRAPPER ── */}
      <div className="mobile-wrapper">
        <div className="mobile-logo-wrap">
          <div className="mobile-logo-inner">
            <img src="/logo.png?v=2" alt="TxGuard Logo" className="logo-img" />
          </div>
        </div>

        <h1 className="mobile-heading">
          Know Before <span className="mobile-heading-accent">You Send.</span>
        </h1>
        <p className="mobile-subtitle">AI-powered wallet security · 5 chains</p>

        <div className="mobile-segment-tabs">
          <button 
            className={`mobile-segment-btn ${activeTab === 'scan' ? 'active' : ''}`}
            onClick={() => setActiveTab('scan')}
          >
            Scan Wallet
          </button>
          <button 
            className={`mobile-segment-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="mobile-dashboard-scroll" style={{ width: '100%' }}>
            {renderDashboardView()}
          </div>
        ) : (
          <>
            <div className="mobile-chain-selector">
              {CHAINS.map((c, index) => (
                <span key={c.id}>
                  <span
                    className={`mobile-chain-text-btn ${chain === c.id ? 'active' : ''}`}
                    onClick={() => { setChain(c.id); setResult(null); setAnswer('') }}
                  >
                    {c.label}
                  </span>
                  {index < CHAINS.length - 1 && <span className="mobile-chain-separator"> · </span>}
                </span>
              ))}
            </div>

            <div className="quick-chips">
              <button className="quick-chip" onClick={() => handleQuickChip('scan')}>Scan wallet</button>
              <button className="quick-chip" onClick={() => handleQuickChip('score')}>Check risk score</button>
              <button className="quick-chip" onClick={() => handleQuickChip('safe')}>Is this safe?</button>
            </div>

            <div className="results-scroll-area">
              {renderPaying()}
              {renderLoading()}
              {renderError()}
              {renderResults()}
              {renderEmptyState()}

              <footer className="mobile-footer">
                <span>TxGuard · Know Before You Send</span>
                <button className="report-bug-btn" onClick={openBugModal}>
                  <svg className="bug-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <path d="M12 2v9M8 3l1 2M16 3l-1 2M4 14H2M22 14h-2M4 18H2M22 18h-2" />
                  </svg>
                  <span>Report a Bug</span>
                </button>
              </footer>
            </div>
          </>
        )}
      </div>

      {/* ── MOBILE BOTTOM INPUT AREA ── */}
      {activeTab === 'scan' && (
        <div className="mobile-input-area">
          <div className="mobile-input-card">
            <div className="mobile-input-row">
              <input
                className="mobile-wallet-input"
                placeholder={selectedChain.placeholder}
                value={wallet}
                disabled={loading || paying}
                onChange={e => setWallet(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && !paying && analyze()}
              />
              {wallet && !loading && !paying && (
                <button
                  onClick={() => setWallet('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-hint)',
                    fontSize: '12px',
                    padding: '4px'
                  }}
                >
                  ✕
                </button>
              )}
              <button
                className="mobile-send-btn"
                onClick={() => analyze()}
                disabled={loading || paying || !wallet.trim()}
              >
                <ArrowUpIcon />
              </button>
            </div>
            <div className="mobile-icons-row">
              <button className="mobile-icon-btn" onClick={() => setWallet(w => w + '+')}>➕</button>
              <button className="mobile-icon-btn" onClick={handlePaste} title="Paste"><CopyIcon /></button>
              <button className="mobile-icon-btn" title="Link"><LinkIcon /></button>
            </div>
          </div>
        </div>
      )}
      {/* ── BUG REPORT MODAL ── */}
      {isBugModalOpen && renderBugModal()}
    </div>
  )
}

function getExplorerTxLink(chain, hash) {
  switch (chain) {
    case 'ethereum': return `https://etherscan.io/tx/${hash}`;
    case 'bnb':      return `https://bscscan.com/tx/${hash}`;
    case 'celo':     return `https://celoscan.io/tx/${hash}`;
    case 'solana':   return `https://explorer.solana.com/tx/${hash}`;
    case 'bitcoin':  return `https://blockstream.info/tx/${hash}`;
    default:         return '#';
  }
}

function formatRelativeTime(timestampMs) {
  const diff = Date.now() - timestampMs;
  if (diff < 60000) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isValidAddress(address, chain) {
  if (!address) return false;
  const cleaned = address.trim();
  
  switch (chain) {
    case 'ethereum':
    case 'bnb':
    case 'celo':
      return /^0x[a-fA-F0-9]{40}$/.test(cleaned);
      
    case 'solana':
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleaned);
      
    case 'bitcoin':
      const isLegacy = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(cleaned);
      const isBech32 = /^bc1[ac-hj-np-z02-9]{11,71}$/i.test(cleaned);
      return isLegacy || isBech32;
      
    default:
      return true;
  }
}