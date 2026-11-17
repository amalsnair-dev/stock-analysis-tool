# AURIX API Integration Reference 🔌

Documentation of the backend APIs integrated into the **AURIX Mobile App**.

---

## 1. SoftHub API (Port 8081)

Base Path: `http://<SOFTHUB_HOST>:8081/api`

### `POST /verifyLicense`
Validates enterprise serial license keys.

**Request Payload:**
```json
{
  "serialNumber": "BTS-STO-XXXXX"
}
```

**Response Payload:**
```json
{
  "status": "SUCCESS",
  "companyId": "BTS71680ELS",
  "companyCode": "ELS",
  "companyDbId": 2,
  "companyName": "Allure Jewelry LLC",
  "licenseStatus": "ACTIVE",
  "expired": false
}
```

---

## 2. Company & Branch API

### `GET /branches?companyId={companyId}`
Retrieves active branches under a validated company.

**Response:**
```json
[
  { "branchCode": "MAIN", "branchName": "Main Showroom" },
  { "branchCode": "MALL", "branchName": "Mall Counter" }
]
```

---

## 3. Stock Taking API

Base Path: `http://<OWNER_HOST>:8080/aurix`

### `POST /stock-taking/verify-tag`
Validates an individual tag scanned by the mobile camera.

**Request:**
```json
{
  "tagNumber": "TAG-10023",
  "branchCode": "MAIN",
  "counterCode": "CTR-1"
}
```

### `POST /stock-taking/save-batch`
Syncs an audit batch session to the database.
