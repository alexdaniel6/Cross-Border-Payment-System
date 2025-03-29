;; Currency Conversion Contract
;; This contract manages exchange rates between different currencies

(define-data-var admin principal tx-sender)

;; Data structure for storing exchange rates
;; The rate is represented as a fixed-point number with 8 decimal places
;; For example, 1 USD = 0.85 EUR would be represented as 85000000
(define-map exchange-rates
  {
    from-currency: (string-utf8 10),
    to-currency: (string-utf8 10)
  }
  {
    rate: uint,
    last-updated: uint
  }
)

;; Get exchange rate between two currencies
(define-read-only (get-exchange-rate (from-currency (string-utf8 10)) (to-currency (string-utf8 10)))
  (map-get? exchange-rates { from-currency: from-currency, to-currency: to-currency })
)

;; Set exchange rate (admin only)
(define-public (set-exchange-rate
    (from-currency (string-utf8 10))
    (to-currency (string-utf8 10))
    (rate uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (ok (map-set exchange-rates
      { from-currency: from-currency, to-currency: to-currency }
      { rate: rate, last-updated: block-height }
    ))
  )
)

;; Convert amount from one currency to another
(define-read-only (convert-currency
    (amount uint)
    (from-currency (string-utf8 10))
    (to-currency (string-utf8 10)))
  (let (
    (rate-data (map-get? exchange-rates { from-currency: from-currency, to-currency: to-currency }))
  )
    (if (is-some rate-data)
      (ok (/ (* amount (get rate (unwrap-panic rate-data))) u100000000))
      (err u404) ;; Exchange rate not found
    )
  )
)

;; Transfer admin rights
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (ok (var-set admin new-admin))
  )
)
