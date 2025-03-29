;; Identity Verification Contract
;; This contract validates sender and recipient information

(define-data-var admin principal tx-sender)

;; Data structure for storing verified identities
(define-map verified-identities
  { user: principal }
  {
    verified: bool,
    name: (string-utf8 100),
    country: (string-utf8 50),
    id-number: (string-utf8 50),
    verification-date: uint
  }
)

;; Check if a user is verified
(define-read-only (is-verified (user principal))
  (default-to false (get verified (map-get? verified-identities { user: user })))
)

;; Get user verification details
(define-read-only (get-user-details (user principal))
  (map-get? verified-identities { user: user })
)

;; Only admin can verify users
(define-public (verify-user
    (user principal)
    (name (string-utf8 100))
    (country (string-utf8 50))
    (id-number (string-utf8 50)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (ok (map-set verified-identities
      { user: user }
      {
        verified: true,
        name: name,
        country: country,
        id-number: id-number,
        verification-date: block-height
      }
    ))
  )
)

;; Revoke verification
(define-public (revoke-verification (user principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (ok (map-delete verified-identities { user: user }))
  )
)

;; Transfer admin rights
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (ok (var-set admin new-admin))
  )
)
