 ;; TxGuard Scan Registry
;; Logs wallet security scan results onchain for auditability.
;; Each scan record: target chain, target address, risk score (0-100), and the principal who logged it.

(define-constant ERR-INVALID-SCORE (err u100))
(define-constant ERR-NOT-FOUND (err u101))

;; Incrementing scan ID, used as the map key
(define-data-var next-scan-id uint u0)

;; scan-id -> scan record
(define-map scans
  uint
  {
    chain: (string-ascii 16),
    target: (string-ascii 64),
    risk-score: uint,
    submitted-by: principal,
    block-height: uint
  }
)

;; Quick lookup: how many scans exist for a given (chain, target) pair
(define-map scan-counts
  { chain: (string-ascii 16), target: (string-ascii 64) }
  uint
)

;; Log a new scan result onchain.
;; risk-score must be between 0 and 100 inclusive.
(define-public (log-scan (chain (string-ascii 16)) (target (string-ascii 64)) (risk-score uint))
  (let (
      (id (var-get next-scan-id))
      (count-key { chain: chain, target: target })
      (current-count (default-to u0 (map-get? scan-counts count-key)))
    )
    (asserts! (<= risk-score u100) ERR-INVALID-SCORE)
    (map-set scans id {
      chain: chain,
      target: target,
      risk-score: risk-score,
      submitted-by: tx-sender,
      block-height: stacks-block-height
    })
    (map-set scan-counts count-key (+ current-count u1))
    (var-set next-scan-id (+ id u1))
    (ok id)
  )
)

;; Read a single scan record by ID
(define-read-only (get-scan (id uint))
  (map-get? scans id)
)

;; How many times has this (chain, target) pair been scanned?
(define-read-only (get-scan-count (chain (string-ascii 16)) (target (string-ascii 64)))
  (default-to u0 (map-get? scan-counts { chain: chain, target: target }))
)

;; Total number of scans logged across all chains/targets
(define-read-only (get-total-scans)
  (var-get next-scan-id)
)