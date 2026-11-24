;; LOCAL CANDIDATE ONLY. Never added to mainnet deployment plans automatically.
;; Only a salted commitment is public. A receipt proves registration, not accuracy.
(define-map receipts { submitter: principal, commitment: (buff 32) }
  { registered-at: uint })
(define-constant ERR-INVALID (err u200))
(define-constant ERR-DUPLICATE (err u201))
(define-constant ERR-INDIRECT (err u202))

(define-public (register (commitment (buff 32)))
  (let ((key { submitter: tx-sender, commitment: commitment }))
    ;; Prevent a contract from registering on behalf of an unsuspecting caller.
    (asserts! (is-eq tx-sender contract-caller) ERR-INDIRECT)
    (asserts! (and (is-eq (len commitment) u32)
      (not (is-eq commitment 0x0000000000000000000000000000000000000000000000000000000000000000))) ERR-INVALID)
    (asserts! (map-insert receipts key { registered-at: stacks-block-height }) ERR-DUPLICATE)
    (ok commitment)))

(define-read-only (get-receipt (submitter principal) (commitment (buff 32)))
  (map-get? receipts { submitter: submitter, commitment: commitment }))
